# Chat Feature Implementation Specification

**Project**: Finan Financial Management System  
**Feature**: Secure Real-time Chat Module  
**Branch**: `feature/backend-testing` → will create `feature/chat-module`  
**Date**: December 17, 2025  
**Status**: SPECIFICATION - PENDING APPROVAL

---

## 🎯 Overview

Implement a secure, real-time chat system supporting:
- **Customer ↔ Staff** direct messaging (1-to-1)
- **Staff-only** group chats (Admin/Manager)
- **Document sharing** (Invoices & Quotes as embedded cards)
- **Full audit logging** of all chat activities
- **Real-time delivery** via Socket.IO

---

## 📋 Implementation Plan (6 Parts)

### Part 1: Database Models & Migrations
### Part 2: Backend Services & Business Logic
### Part 3: REST API Endpoints
### Part 4: Real-time Socket.IO Integration
### Part 5: Frontend React Components
### Part 6: Frontend Socket Integration & Testing

---

## 🔑 KEY DECISIONS & ASSUMPTIONS

### Decision 1: Customer Authentication

**Current Analysis**:
- Existing system has `User` model with roles: ADMIN, MANAGER, USER
- Existing system has `Customer` model (for customer records in invoices/quotes)
- No evidence of Customer portal authentication currently

**My Decision**:
✅ **Option A: Extend Customer model for authentication (RECOMMENDED)**

**Reasoning**:
1. Customer records already exist in database
2. Customers have email addresses (used for invoicing)
3. Minimal schema changes required
4. Maintains separation between staff (User) and customers (Customer)

**Implementation Plan**:
```javascript
// Add to Customer model (src/database/models/Customer.js)
{
  email: { 
    type: DataTypes.STRING, 
    unique: true,  // Add unique constraint
    allowNull: false 
  },
  password: {
    type: DataTypes.STRING,  // NEW FIELD - bcrypt hash
    allowNull: true  // Nullable initially for existing customers
  },
  isActive: {
    type: DataTypes.BOOLEAN,  // NEW FIELD - can disable customer login
    defaultValue: true
  },
  lastLoginAt: {
    type: DataTypes.DATE  // NEW FIELD - track customer logins
  }
}
```

**Migration Strategy**:
1. Add migration to add password, isActive, lastLoginAt to Customers table
2. Make email unique if not already
3. Existing customers will have null password (can set password on first portal access)

**Auth Endpoints** (new):
```
POST /api/v1/auth/customer/login
POST /api/v1/auth/customer/set-password (for first-time setup)
POST /api/v1/auth/customer/change-password
POST /api/v1/auth/customer/forgot-password (optional - Phase 2)
```

**JWT Token Strategy**:
```javascript
// For Staff Users (existing)
{
  sub: "user:UUID",
  userId: "UUID",
  role: "admin" | "manager" | "user",
  type: "staff"
}

// For Customers (new)
{
  sub: "customer:UUID",
  customerId: "UUID",
  type: "customer",
  email: "customer@email.com"
}
```

**Middleware Changes**:
- Update `src/middleware/auth.js` to handle both token types
- Add `req.actorType` ('staff' | 'customer')
- Add `req.customerId` for customer tokens
- Keep existing `req.userId` and `req.userRole` for staff

---

### Decision 2: Database Schema Decisions

**Chat Conversation Table**:
```sql
CREATE TABLE "ChatConversations" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL CHECK (type IN ('CUSTOMER_DM', 'STAFF_GROUP', 'STAFF_DM')),
  title VARCHAR(255),  -- Required for STAFF_GROUP, nullable otherwise
  customerId UUID REFERENCES "Customers"(id) ON DELETE CASCADE,
  createdByUserId UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  lastMessageAt TIMESTAMP WITH TIME ZONE,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Constraints
  CONSTRAINT check_customer_dm CHECK (
    (type = 'CUSTOMER_DM' AND customerId IS NOT NULL) OR
    (type != 'CUSTOMER_DM' AND customerId IS NULL)
  ),
  CONSTRAINT check_staff_group_title CHECK (
    (type = 'STAFF_GROUP' AND title IS NOT NULL) OR
    (type != 'STAFF_GROUP')
  )
);

CREATE INDEX idx_chat_conversations_customer ON "ChatConversations"(customerId);
CREATE INDEX idx_chat_conversations_last_message ON "ChatConversations"(lastMessageAt DESC);
CREATE INDEX idx_chat_conversations_type ON "ChatConversations"(type);
```

**Chat Participant Table**:
```sql
CREATE TABLE "ChatParticipants" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversationId UUID NOT NULL REFERENCES "ChatConversations"(id) ON DELETE CASCADE,
  userId UUID REFERENCES "Users"(id) ON DELETE CASCADE,
  customerId UUID REFERENCES "Customers"(id) ON DELETE CASCADE,
  joinedAt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  leftAt TIMESTAMP WITH TIME ZONE,
  lastReadMessageId UUID REFERENCES "ChatMessages"(id) ON DELETE SET NULL,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Constraints
  CONSTRAINT check_exactly_one_actor CHECK (
    (userId IS NOT NULL AND customerId IS NULL) OR
    (userId IS NULL AND customerId IS NOT NULL)
  ),
  CONSTRAINT unique_user_per_conversation UNIQUE(conversationId, userId),
  CONSTRAINT unique_customer_per_conversation UNIQUE(conversationId, customerId)
);

CREATE INDEX idx_chat_participants_conversation ON "ChatParticipants"(conversationId);
CREATE INDEX idx_chat_participants_user ON "ChatParticipants"(userId) WHERE userId IS NOT NULL;
CREATE INDEX idx_chat_participants_customer ON "ChatParticipants"(customerId) WHERE customerId IS NOT NULL;
```

**Chat Message Table**:
```sql
CREATE TABLE "ChatMessages" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversationId UUID NOT NULL REFERENCES "ChatConversations"(id) ON DELETE CASCADE,
  senderUserId UUID REFERENCES "Users"(id) ON DELETE SET NULL,
  senderCustomerId UUID REFERENCES "Customers"(id) ON DELETE SET NULL,
  messageType VARCHAR(50) NOT NULL CHECK (messageType IN ('TEXT', 'SYSTEM', 'DOCUMENT', 'FILE')),
  body TEXT,
  metadata JSONB,
  createdAt TIMESTAMP WITH TIME ZONE NOT NULL,
  editedAt TIMESTAMP WITH TIME ZONE,
  deletedAt TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT check_exactly_one_sender CHECK (
    (senderUserId IS NOT NULL AND senderCustomerId IS NULL) OR
    (senderUserId IS NULL AND senderCustomerId IS NOT NULL)
  ),
  CONSTRAINT check_text_has_body CHECK (
    messageType != 'TEXT' OR (messageType = 'TEXT' AND body IS NOT NULL)
  ),
  CONSTRAINT check_document_has_metadata CHECK (
    messageType != 'DOCUMENT' OR (messageType = 'DOCUMENT' AND metadata IS NOT NULL)
  )
);

CREATE INDEX idx_chat_messages_conversation ON "ChatMessages"(conversationId, createdAt DESC);
CREATE INDEX idx_chat_messages_sender_user ON "ChatMessages"(senderUserId) WHERE senderUserId IS NOT NULL;
CREATE INDEX idx_chat_messages_sender_customer ON "ChatMessages"(senderCustomerId) WHERE senderCustomerId IS NOT NULL;
CREATE INDEX idx_chat_messages_deleted ON "ChatMessages"(deletedAt) WHERE deletedAt IS NULL;
```

**Document Metadata Schema** (JSONB):
```javascript
// For messageType = 'DOCUMENT'
{
  documentType: "invoice" | "quote",
  documentId: "uuid",
  documentNumber: "INV-001", // Optional convenience
  total: 1500.00,            // Optional convenience
  customerName: "Acme Corp"  // Optional convenience
}
```

---

### Decision 3: Socket.IO Setup

**Package Installation**:
```bash
# Backend
npm install socket.io@4.7.2

# Frontend  
npm install socket.io-client@4.7.2
```

**Server Setup** (src/server.js):
```javascript
const http = require('http');
const { Server } = require('socket.io');

// After Express app setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:8080'],
    credentials: true
  }
});

// Socket handlers
require('./sockets')(io);

// Listen on server instead of app
server.listen(PORT, () => {
  // ...
});
```

**Socket Authentication Flow**:
```javascript
// Client sends token in handshake
socket.on('connection', async (socket) => {
  const token = socket.handshake.auth.token;
  
  // Validate JWT
  const decoded = jwt.verify(token, JWT_SECRET);
  
  // Load actor identity
  socket.actorType = decoded.type; // 'staff' | 'customer'
  socket.userId = decoded.userId;
  socket.customerId = decoded.customerId;
  
  // Join rooms for all conversations user participates in
  const conversations = await getParticipantConversations(socket);
  conversations.forEach(conv => {
    socket.join(`conv:${conv.id}`);
  });
});
```

---

### Decision 4: REST API Design

**Base Path**: `/api/v1/chat`

**Endpoints**:

1. **List Conversations**
   ```
   GET /api/v1/chat/conversations
   Auth: Required (Staff or Customer)
   Returns: Only conversations where requester is participant
   Response: {
     conversations: [{
       id, type, title, customerId,
       lastMessageAt, lastMessage,
       participants: [{ userId, customerId, name, role }],
       unreadCount: 5
     }]
   }
   ```

2. **Create Conversation**
   ```
   POST /api/v1/chat/conversations
   Auth: Required (Staff only - ADMIN or MANAGER)
   Body: {
     type: 'CUSTOMER_DM' | 'STAFF_GROUP' | 'STAFF_DM',
     customerId: 'uuid',  // Required if CUSTOMER_DM
     title: 'string',     // Required if STAFF_GROUP
     participantUserIds: ['uuid', 'uuid']
   }
   Returns: Conversation object (idempotent for CUSTOMER_DM)
   ```

3. **Get Messages**
   ```
   GET /api/v1/chat/conversations/:conversationId/messages
   Query: ?cursor=timestamp&limit=50
   Auth: Required (Must be participant)
   Returns: {
     messages: [{
       id, messageType, body, metadata,
       senderUserId, senderCustomerId, senderName,
       createdAt, editedAt, deletedAt
     }],
     nextCursor: 'timestamp',
     hasMore: true
   }
   ```

4. **Send Message**
   ```
   POST /api/v1/chat/conversations/:conversationId/messages
   Auth: Required (Must be participant)
   Body: {
     messageType: 'TEXT' | 'DOCUMENT',
     body: 'string',          // Required if TEXT
     metadata: { ... }        // Required if DOCUMENT
   }
   Returns: Message object
   Side Effects:
     - Updates conversation.lastMessageAt
     - Emits socket event to conversation room
     - Creates audit log entry
   ```

5. **Mark as Read**
   ```
   POST /api/v1/chat/conversations/:conversationId/read
   Auth: Required (Must be participant)
   Body: {
     lastReadMessageId: 'uuid'
   }
   Returns: { success: true }
   Side Effects:
     - Updates participant.lastReadMessageId
     - May emit socket event for read receipts
   ```

6. **Share Invoice** (Helper endpoint)
   ```
   POST /api/v1/chat/conversations/:conversationId/share/invoice
   Auth: Required (Staff only)
   Body: {
     invoiceId: 'uuid'
   }
   Validation:
     - Conversation must be CUSTOMER_DM
     - Invoice must belong to conversation's customer
   Returns: Message object with messageType=DOCUMENT
   ```

7. **Share Quote** (Helper endpoint)
   ```
   POST /api/v1/chat/conversations/:conversationId/share/quote
   Auth: Required (Staff only)
   Body: {
     quoteId: 'uuid'
   }
   Validation:
     - Conversation must be CUSTOMER_DM
     - Quote must belong to conversation's customer
   Returns: Message object with messageType=DOCUMENT
   ```

---

### Decision 5: Authorization Strategy

**Multi-Layer Authorization**:

**Layer 1: JWT Authentication**
- All endpoints require valid JWT
- Reject invalid/expired tokens
- Extract actor identity (staff or customer)

**Layer 2: Conversation Membership**
- Every conversation operation checks if requester is participant
- Query: `SELECT 1 FROM ChatParticipants WHERE conversationId = ? AND (userId = ? OR customerId = ?)`
- Return 403 if not participant

**Layer 3: Role-Based Actions**
- Customers can ONLY:
  - List their CUSTOMER_DM conversations
  - Read messages from their conversations
  - Send messages to their conversations
  - Mark messages as read
- Customers CANNOT:
  - Create conversations
  - Add/remove participants
  - Share documents
  - Access STAFF_GROUP or STAFF_DM

- Staff (ADMIN/MANAGER) can:
  - Create any conversation type
  - Add/remove participants
  - Share documents
  - Access all conversation types they participate in

**Layer 4: Document Sharing Authorization**
```javascript
// When sharing invoice/quote
async shareInvoice(conversationId, invoiceId, staffUserId) {
  // 1. Verify conversation is CUSTOMER_DM
  const conv = await ChatConversation.findByPk(conversationId);
  if (conv.type !== 'CUSTOMER_DM') {
    throw new Error('Can only share documents in customer conversations');
  }
  
  // 2. Verify invoice belongs to conversation's customer
  const invoice = await Invoice.findByPk(invoiceId);
  if (invoice.customerId !== conv.customerId) {
    throw new Error('Invoice does not belong to this customer');
  }
  
  // 3. Verify staff is participant
  const isParticipant = await ChatParticipant.findOne({
    where: { conversationId, userId: staffUserId }
  });
  if (!isParticipant) {
    throw new Error('Not authorized');
  }
  
  // 4. Create document message
  // ...
}
```

---

### Decision 6: Socket.IO Events

**Server Events** (emitted by server):

```javascript
// New message in conversation
socket.emit('chat:message', {
  conversationId: 'uuid',
  message: { /* full message object */ }
});

// Conversation updated (new message preview, unread count)
socket.emit('chat:conversationUpdated', {
  conversationId: 'uuid',
  lastMessageAt: 'timestamp',
  lastMessage: { body, senderName },
  unreadCount: 5
});

// Message marked as read (optional - read receipts)
socket.emit('chat:messageRead', {
  conversationId: 'uuid',
  userId: 'uuid',
  lastReadMessageId: 'uuid'
});

// Typing indicator (optional - Phase 2)
socket.emit('chat:typing', {
  conversationId: 'uuid',
  userId: 'uuid',
  isTyping: true
});
```

**Client Events** (received from client):

```javascript
// Send message (with instant optimistic UI)
socket.on('chat:send', async (payload) => {
  const { conversationId, messageType, body, metadata } = payload;
  
  // 1. Verify membership
  // 2. Persist to database
  // 3. Broadcast to room
  
  io.to(`conv:${conversationId}`).emit('chat:message', {
    conversationId,
    message: createdMessage
  });
});

// Mark as read
socket.on('chat:markRead', async (payload) => {
  const { conversationId, lastReadMessageId } = payload;
  // Update database
  // Optionally broadcast read receipt
});

// Typing indicator (optional)
socket.on('chat:typing', async (payload) => {
  const { conversationId, isTyping } = payload;
  // Broadcast to others in room
  socket.to(`conv:${conversationId}`).emit('chat:typing', {
    conversationId,
    userId: socket.userId,
    isTyping
  });
});
```

**Room Management**:
```javascript
// On connect: join all participant rooms
socket.on('connection', async (socket) => {
  const conversations = await getParticipantConversations(socket);
  conversations.forEach(conv => {
    socket.join(`conv:${conv.id}`);
  });
});

// On new conversation: join room
socket.on('chat:joinConversation', (conversationId) => {
  // Verify membership first
  socket.join(`conv:${conversationId}`);
});

// On disconnect: automatic room leave
socket.on('disconnect', () => {
  // Socket.IO handles room cleanup
});
```

---

### Decision 7: Audit Logging

**Audit Events to Log**:

```javascript
// Conversation events
{
  action: 'chat.conversation.create',
  entity: 'ChatConversation',
  entityId: conversationId,
  userId: staffUserId,
  changes: {
    type: 'CUSTOMER_DM',
    customerId: 'uuid',
    participants: ['uuid', 'uuid']
  }
}

// Message events
{
  action: 'chat.message.create',
  entity: 'ChatMessage',
  entityId: messageId,
  userId: senderUserId || null,
  customerId: senderCustomerId || null,
  changes: {
    conversationId: 'uuid',
    messageType: 'TEXT',
    bodyLength: 150  // Don't log full message for privacy
  }
}

// Document share events
{
  action: 'chat.document.share',
  entity: 'ChatMessage',
  entityId: messageId,
  userId: staffUserId,
  changes: {
    conversationId: 'uuid',
    documentType: 'invoice',
    documentId: 'uuid',
    customerId: 'uuid'
  }
}

// Message edit/delete
{
  action: 'chat.message.delete',
  entity: 'ChatMessage',
  entityId: messageId,
  userId: staffUserId,
  changes: {
    oldBody: 'original text',
    deletedAt: 'timestamp'
  }
}
```

**Privacy Consideration**:
- Do NOT log full message bodies in audit logs
- Log message length and metadata only
- Sensitive customer data should not appear in audit logs
- Keep actual messages only in ChatMessages table

---

### Decision 8: Frontend Architecture

**New Files to Create**:

```
frontend/src/
  pages/
    Chat/
      index.jsx                 // Main Chat page component
      ChatShell.jsx             // Layout wrapper
      ConversationList.jsx      // Left sidebar
      MessageList.jsx           // Center panel
      MessageComposer.jsx       // Bottom input area
      DocumentCard.jsx          // Renders invoice/quote cards
      
  services/
    chatApi.js                  // REST API calls
    chatSocket.js               // Socket.IO client wrapper
    
  hooks/
    useChat.js                  // Main chat state hook
    useConversations.js         // Conversation list hook
    useMessages.js              // Message list hook with pagination
    useSocket.js                // Socket connection hook
    
  contexts/
    ChatContext.jsx             // Global chat state (optional)
```

**Component Hierarchy**:
```
<Chat> (pages/Chat/index.jsx)
  └─ <ChatShell>
      ├─ <ConversationList>
      │   └─ <ConversationItem> (multiple)
      │       ├─ Avatar
      │       ├─ Title
      │       ├─ Last message preview
      │       └─ Unread badge
      │
      └─ <MessagePanel>
          ├─ <MessageList>
          │   └─ <Message> (multiple)
          │       ├─ <TextMessage>
          │       ├─ <DocumentCard>  (for DOCUMENT type)
          │       └─ <SystemMessage> (for SYSTEM type)
          │
          └─ <MessageComposer>
              ├─ Text input
              ├─ Send button
              └─ Document share buttons (staff only)
```

**State Management Strategy**:

**Option A: Context + Hooks (CHOSEN)**
- ChatContext provides global chat state
- useChat hook for accessing state
- Socket events update context
- Simple, fits existing architecture

**Option B: Redux (Rejected)**
- Overkill for chat feature
- Not used elsewhere in app
- Steeper learning curve

**Option C: Component State Only (Rejected)**
- Hard to sync across components
- Socket events need global handler

---

### Decision 9: Security Implementation

**Backend Security Checklist**:

✅ **Never trust client input**
- Validate all conversation IDs
- Validate all message IDs
- Validate all participant lists
- Check membership on EVERY operation

✅ **Enforce conversation type rules**
```javascript
// Service layer validation
validateConversationCreation(type, customerId, participantUserIds) {
  if (type === 'CUSTOMER_DM') {
    if (!customerId) throw new Error('Customer required for CUSTOMER_DM');
    if (participantUserIds.includes(customerId)) {
      throw new Error('Customer cannot be in participant user list');
    }
  }
  
  if (type === 'STAFF_GROUP' || type === 'STAFF_DM') {
    if (customerId) throw new Error('Customer not allowed in staff conversations');
  }
}
```

✅ **Socket authorization**
```javascript
// On every socket event
socket.on('chat:send', async (payload) => {
  // Re-verify membership (don't trust socket.rooms)
  const isParticipant = await verifyParticipant(
    payload.conversationId,
    socket.userId,
    socket.customerId
  );
  
  if (!isParticipant) {
    socket.emit('error', { message: 'Not authorized' });
    return;
  }
  
  // Proceed with message creation
});
```

✅ **Rate limiting**
```javascript
// Add to existing rate limiter
const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 minute
  max: 30,                   // 30 messages per minute
  message: 'Too many messages, please slow down'
});

router.post('/conversations/:id/messages', chatRateLimiter, sendMessage);
```

✅ **Input validation**
```javascript
// Message body max length
const MAX_MESSAGE_LENGTH = 5000;

// Validate message
if (messageType === 'TEXT' && (!body || body.length > MAX_MESSAGE_LENGTH)) {
  throw new Error('Invalid message body');
}

// Sanitize output (prevent XSS)
// Frontend renders as plain text, not HTML
// But still sanitize in backend
const sanitizedBody = validator.escape(body);
```

---

### Decision 10: Testing Strategy

**Phase 1: Manual Testing** (during development)
- Test each endpoint with Postman
- Test socket events with socket.io-client test script
- Test UI flows manually

**Phase 2: Automated Tests** (Part 6)

**Backend Tests** (Jest + Supertest):
```javascript
// tests/__tests__/chat/authorization.test.js

describe('Chat Authorization', () => {
  test('Customer cannot list staff group conversations', async () => {
    // Create STAFF_GROUP with admin
    // Login as customer
    // GET /chat/conversations
    // Expect: staff group not in list
  });
  
  test('Customer cannot access non-participant conversation', async () => {
    // Create CUSTOMER_DM for Customer A
    // Login as Customer B
    // GET /chat/conversations/:id/messages
    // Expect: 403 Forbidden
  });
  
  test('Staff cannot access conversation they are not in', async () => {
    // Create CUSTOMER_DM with Manager A
    // Login as Manager B
    // GET /chat/conversations/:id/messages
    // Expect: 403 Forbidden
  });
  
  test('Cannot share invoice to wrong customer', async () => {
    // Create CUSTOMER_DM for Customer A
    // Create invoice for Customer B
    // POST /chat/conversations/:id/share/invoice
    // Expect: 403 Forbidden
  });
});
```

**Socket Tests**:
```javascript
// tests/__tests__/chat/socket.test.js

describe('Socket Authorization', () => {
  test('Cannot receive messages from non-participant conversation', async () => {
    // Connect as Customer A
    // Send message to STAFF_GROUP
    // Expect: Customer A does not receive message
  });
  
  test('Cannot send message to unauthorized conversation', async () => {
    // Connect as Customer A
    // Attempt to send to CUSTOMER_DM of Customer B
    // Expect: Error event, message not created
  });
});
```

**Frontend Tests** (React Testing Library):
```javascript
// frontend/src/pages/Chat/__tests__/MessageList.test.jsx

describe('MessageList', () => {
  test('Renders text messages correctly', () => {
    // Render with mock messages
    // Expect: messages displayed
  });
  
  test('Renders document cards with click handler', () => {
    // Render DOCUMENT message
    // Expect: card with invoice number
    // Click card
    // Expect: navigation to /invoices/:id
  });
  
  test('Does not render deleted messages', () => {
    // Render with deleted message
    // Expect: deleted message not visible
  });
});
```

---

## 📁 File Structure

### Backend Files to Create/Modify

**New Files**:
```
src/
  database/
    models/
      ChatConversation.js        [NEW]
      ChatMessage.js             [NEW]
      ChatParticipant.js         [NEW]
    migrations/
      YYYYMMDDHHMMSS-create-chat-conversations.js     [NEW]
      YYYYMMDDHHMMSS-create-chat-participants.js      [NEW]
      YYYYMMDDHHMMSS-create-chat-messages.js          [NEW]
      YYYYMMDDHHMMSS-add-customer-auth-fields.js      [NEW]
      
  modules/
    chat/
      controller.js              [NEW]
      routes.js                  [NEW]
      service.js                 [NEW]
      validators.js              [NEW]
      
  sockets/
    index.js                     [NEW]
    chat.socket.js               [NEW]
    auth.js                      [NEW] - Socket authentication
    
  routes/
    v1/
      auth.customer.routes.js    [NEW] - Customer login endpoints
      
tests/
  __tests__/
    chat/
      authorization.test.js      [NEW]
      conversation.test.js       [NEW]
      message.test.js            [NEW]
      socket.test.js             [NEW]
```

**Modified Files**:
```
src/
  server.js                      [MODIFY] - Add Socket.IO
  middleware/auth.js             [MODIFY] - Handle customer tokens
  database/models/index.js       [MODIFY] - Add chat models
  database/models/Customer.js    [MODIFY] - Add auth fields
  routes/v1/index.js             [MODIFY] - Add chat routes
  
package.json                     [MODIFY] - Add socket.io
```

### Frontend Files to Create/Modify

**New Files**:
```
frontend/src/
  pages/
    Chat/
      index.jsx                  [NEW]
      ChatShell.jsx              [NEW]
      ConversationList.jsx       [NEW]
      MessageList.jsx            [NEW]
      MessageComposer.jsx        [NEW]
      DocumentCard.jsx           [NEW]
      Chat.css                   [NEW]
      
  services/
    chatApi.js                   [NEW]
    chatSocket.js                [NEW]
    
  hooks/
    useChat.js                   [NEW]
    useConversations.js          [NEW]
    useMessages.js               [NEW]
    useSocket.js                 [NEW]
    
  contexts/
    ChatContext.jsx              [NEW]
    
  __tests__/
    pages/
      Chat/
        MessageList.test.jsx     [NEW]
        ConversationList.test.jsx [NEW]
```

**Modified Files**:
```
frontend/src/
  App.jsx                        [MODIFY] - Add /chat route
  components/Sidebar.jsx         [MODIFY] - Add chat menu item
  config/menuConfig.js           [MODIFY] - Add chat to menu
  services/apiClient.js          [MODIFY] - Handle customer tokens
  
frontend/package.json            [MODIFY] - Add socket.io-client
```

---

## 🚀 Implementation Timeline

### Part 1: Database (Day 1 - 4 hours)
- Create 3 chat models
- Create 4 migrations
- Test migrations
- Seed test data

### Part 2: Backend Services (Day 1-2 - 6 hours)
- Create chat.service.js
- Implement conversation logic
- Implement message logic
- Implement authorization helpers
- Add customer auth endpoints

### Part 3: REST API (Day 2-3 - 6 hours)
- Create controller + routes
- Add validators
- Add audit logging
- Test with Postman

### Part 4: Socket.IO (Day 3-4 - 6 hours)
- Set up Socket.IO server
- Implement socket auth
- Implement chat events
- Test with socket client

### Part 5: Frontend UI (Day 4-5 - 8 hours)
- Create all React components
- Style with CSS
- Add routing
- Manual testing

### Part 6: Integration & Testing (Day 5-6 - 6 hours)
- Connect socket to UI
- Write automated tests
- Security testing
- Bug fixes

**Total Estimated Time**: 5-6 days (36 hours)

---

## ✅ Pre-Implementation Checklist

Before starting Part 1, confirm:

- [ ] Create new branch `feature/chat-module` from `feature/backend-testing`
- [ ] Install `socket.io` and `socket.io-client` packages
- [ ] Customer authentication approach approved
- [ ] Database schema approved
- [ ] Socket.IO event design approved
- [ ] Testing strategy approved

---

## 🔒 Security Guarantees

This implementation will ensure:

✅ **Zero Trust**: Every operation verifies membership server-side  
✅ **Customer Isolation**: Customers can ONLY access their CUSTOMER_DM conversations  
✅ **Staff Separation**: STAFF_GROUP conversations are invisible to customers  
✅ **Document Verification**: Shared invoices/quotes must belong to conversation customer  
✅ **Socket Security**: Real-time events only sent to authorized participants  
✅ **Audit Trail**: All actions logged for compliance  
✅ **Rate Limiting**: Prevent message spam  
✅ **Input Validation**: Prevent injection attacks  
✅ **XSS Prevention**: Message bodies rendered as plain text  

---

## 📝 Notes and Caveats

1. **Customer Password Setup**: Existing customers will need to set passwords on first portal access. Provide admin UI to send "set password" email links.

2. **Message Deletion**: Soft deletes only. Messages are marked deleted but not removed from database for audit purposes.

3. **File Attachments**: Deferred to Phase 2. Structure supports it with ChatAttachment model.

4. **Typing Indicators**: Optional enhancement, can add after core functionality.

5. **Read Receipts**: Optional, can show "seen by" indicators if desired.

6. **Message Editing**: Optional, requires careful audit logging of changes.

7. **Push Notifications**: Not in scope, but architecture supports it via socket events.

8. **Conversation Archiving**: Not in initial spec, but can add `archivedAt` field later.

---

## ✅ APPROVED DECISIONS (December 17, 2025)

### 1. Customer Authentication Model
✅ **APPROVED**: Extend existing Customer model with authentication fields

**Fields to Add**:
```javascript
{
  // Required fields
  authEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  authEmail: {
    type: DataTypes.STRING(255),
    unique: true,
    allowNull: true
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  passwordUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failedLoginCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resetTokenHash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  resetTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Optional but useful
  authPhone: {
    type: DataTypes.STRING(32),
    unique: true,
    allowNull: true
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}
```

**Indexes**:
```sql
CREATE INDEX idx_customers_auth_enabled ON "Customers"(authEnabled);
CREATE INDEX idx_customers_auth_email ON "Customers"(authEmail) WHERE authEmail IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_auth_email_unique ON "Customers"(authEmail) WHERE authEmail IS NOT NULL;
CREATE UNIQUE INDEX idx_customers_auth_phone_unique ON "Customers"(authPhone) WHERE authPhone IS NOT NULL;
```

**Login Rules**:
- Only allow login if `authEnabled = true` AND `passwordHash IS NOT NULL`
- Lock account after 5 failed login attempts for 30 minutes
- Reset `failedLoginCount` on successful login

### 2. Rate Limiting
✅ **APPROVED**: Enhanced rate limiting strategy

**Per-Conversation Limit**:
```javascript
// 60 messages per minute per conversation
const conversationRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => `conv:${req.params.conversationId}:${req.userId || req.customerId}`,
  message: 'Too many messages to this conversation, please slow down'
});
```

**Global Per-Actor Limit**:
```javascript
// 100 messages per minute globally per actor
const globalChatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => `actor:${req.userId || req.customerId}`,
  message: 'Too many messages sent, please slow down'
});
```

**Admin Settings (Future Implementation)**:
```javascript
// Prepare for settings page - store in database
ChatRateLimitSettings {
  id: UUID PK,
  conversationMaxPerMinute: INTEGER DEFAULT 60,
  globalMaxPerMinute: INTEGER DEFAULT 100,
  enabled: BOOLEAN DEFAULT true,
  updatedAt: TIMESTAMP,
  updatedByUserId: UUID
}
```

### 3. Message Length
✅ **APPROVED**: 5000 characters maximum

```javascript
const MAX_MESSAGE_LENGTH = 5000;

// Validation
if (messageType === 'TEXT' && body.length > MAX_MESSAGE_LENGTH) {
  throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
}
```

### 4. Audit Privacy
✅ **APPROVED**: Do NOT log full message bodies in AuditLog

```javascript
// Audit log entry for message.create
{
  action: 'chat.message.create',
  entity: 'ChatMessage',
  entityId: messageId,
  userId: senderUserId || null,
  customerId: senderCustomerId || null,
  changes: {
    conversationId: 'uuid',
    messageType: 'TEXT',
    bodyLength: 150,        // Log length only
    hasMetadata: true,      // Boolean flag
    // Do NOT include actual body or metadata content
  }
}
```

### 5. Testing Strategy
✅ **APPROVED**: Add minimal auth tests early, not just at the end

**Early Tests** (Part 2 - Backend Services):
```javascript
// tests/__tests__/chat/auth.early.test.js
describe('Chat Authorization - Early Tests', () => {
  test('Customer cannot access staff group', async () => {
    // Minimal test to verify auth works
  });
  
  test('Non-participant cannot read messages', async () => {
    // Verify membership checks work
  });
});
```

**Full Test Suite** (Part 6):
- Complete authorization tests
- Socket security tests
- Frontend integration tests

### 6. Socket.IO Version
✅ **APPROVED**: v4.7.2 pinned

```json
// package.json
{
  "dependencies": {
    "socket.io": "4.7.2"
  }
}

// frontend/package.json
{
  "dependencies": {
    "socket.io-client": "4.7.2"
  }
}
```

---

## 🆕 NEW FEATURE: Mention Detection & Review Pins

### Overview
In STAFF_GROUP chats, automatically detect mentions of customers and users, creating "review pins" to track discussions about specific entities. Allows staff to attach related documents (invoices, quotes, receipts) to the discussion context.

### Database Models

**ChatReviewPin**:
```javascript
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatConversations',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sourceMessageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatMessages',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  matchedEntityType: {
    type: DataTypes.ENUM('CUSTOMER', 'USER'),
    allowNull: false
  },
  matchedEntityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'OPEN'
  },
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: true,  // Can be system-generated
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}
```

**Indexes**:
```sql
CREATE INDEX idx_review_pins_conversation ON "ChatReviewPins"(conversationId);
CREATE INDEX idx_review_pins_status ON "ChatReviewPins"(status);
CREATE INDEX idx_review_pins_entity ON "ChatReviewPins"(matchedEntityType, matchedEntityId);
CREATE INDEX idx_review_pins_source_message ON "ChatReviewPins"(sourceMessageId);
```

**ChatReviewPinLink**:
```javascript
{
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pinId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatReviewPins',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  linkType: {
    type: DataTypes.ENUM('INVOICE', 'QUOTE', 'RECEIPT'),
    allowNull: false
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  addedByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}
```

**Indexes**:
```sql
CREATE INDEX idx_review_pin_links_pin ON "ChatReviewPinLinks"(pinId);
CREATE INDEX idx_review_pin_links_document ON "ChatReviewPinLinks"(linkType, documentId);
CREATE UNIQUE INDEX idx_review_pin_links_unique ON "ChatReviewPinLinks"(pinId, linkType, documentId);
```

### Mention Detection Logic

**Implementation** (chat.service.js):
```javascript
async scanMessageForMentions(messageId, conversationId, messageBody, senderUserId) {
  // Only scan STAFF_GROUP conversations
  const conversation = await ChatConversation.findByPk(conversationId);
  if (conversation.type !== 'STAFF_GROUP') {
    return [];
  }
  
  const pins = [];
  
  // Normalize message for matching
  const normalizedBody = normalizeText(messageBody);
  
  // Scan for customer names
  const customers = await Customer.findAll({
    attributes: ['id', 'name']
  });
  
  for (const customer of customers) {
    const normalizedName = normalizeText(customer.name);
    if (isNameMentioned(normalizedBody, normalizedName)) {
      // Create review pin
      const pin = await ChatReviewPin.create({
        conversationId,
        sourceMessageId: messageId,
        matchedEntityType: 'CUSTOMER',
        matchedEntityId: customer.id,
        status: 'OPEN',
        createdByUserId: senderUserId
      });
      pins.push(pin);
      
      // Audit log
      await auditLog('chat.pin.created', 'ChatReviewPin', pin.id, senderUserId, {
        entityType: 'CUSTOMER',
        entityId: customer.id,
        messageId
      });
    }
  }
  
  // Scan for user names (staff mentions)
  const users = await User.findAll({
    attributes: ['id', 'firstName', 'lastName']
  });
  
  for (const user of users) {
    const fullName = `${user.firstName} ${user.lastName}`;
    const normalizedName = normalizeText(fullName);
    if (isNameMentioned(normalizedBody, normalizedName)) {
      const pin = await ChatReviewPin.create({
        conversationId,
        sourceMessageId: messageId,
        matchedEntityType: 'USER',
        matchedEntityId: user.id,
        status: 'OPEN',
        createdByUserId: senderUserId
      });
      pins.push(pin);
      
      await auditLog('chat.pin.created', 'ChatReviewPin', pin.id, senderUserId, {
        entityType: 'USER',
        entityId: user.id,
        messageId
      });
    }
  }
  
  return pins;
}

// Normalization helper
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Arabic normalization (remove diacritics)
    .replace(/[\u064B-\u065F]/g, '');
}

// Mention detection helper
function isNameMentioned(messageBody, targetName) {
  // Exact full name match (case-insensitive, normalized)
  if (messageBody.includes(targetName)) {
    return true;
  }
  
  // Token boundary match (avoid partial matches)
  const words = messageBody.split(/\s+/);
  const targetWords = targetName.split(/\s+/);
  
  // For short names (< 3 chars), require full match only
  if (targetName.length < 3) {
    return false;
  }
  
  // Check if all target words appear consecutively
  for (let i = 0; i <= words.length - targetWords.length; i++) {
    let match = true;
    for (let j = 0; j < targetWords.length; j++) {
      if (words[i + j] !== targetWords[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  
  return false;
}
```

### REST API Endpoints (Review Pins)

**List Pins**:
```
GET /api/v1/chat/conversations/:conversationId/pins
Auth: Required (Staff only - Admin/Manager)
Query: ?status=OPEN|RESOLVED
Returns: {
  pins: [{
    id, status, matchedEntityType, matchedEntityId,
    entityName, sourceMessage, linkedDocuments,
    createdAt, resolvedAt
  }]
}
```

**Resolve Pin**:
```
POST /api/v1/chat/pins/:pinId/resolve
Auth: Required (Staff only)
Returns: Updated pin
Audit: chat.pin.resolved
```

**Reopen Pin**:
```
POST /api/v1/chat/pins/:pinId/reopen
Auth: Required (Staff only)
Returns: Updated pin
Audit: chat.pin.reopened
```

**Add Document Link**:
```
POST /api/v1/chat/pins/:pinId/links
Auth: Required (Staff only)
Body: {
  linkType: 'INVOICE' | 'QUOTE' | 'RECEIPT',
  documentId: 'uuid'
}
Validation:
  - Verify document exists
  - Verify document belongs to matched customer (if entity is CUSTOMER)
Returns: Created link
Audit: chat.pin.link.added
```

**Remove Document Link**:
```
DELETE /api/v1/chat/pins/:pinId/links/:linkId
Auth: Required (Staff only)
Returns: { success: true }
Audit: chat.pin.link.removed
```

### Frontend UI (Review Pins)

**Components**:
```
Chat/
  ReviewPinsPanel.jsx         // Sidebar panel showing open pins
  PinCard.jsx                 // Individual pin with entity info
  PinDocumentLinks.jsx        // Linked documents (invoices, quotes, receipts)
  AddPinLinkModal.jsx         // Modal to add document links
```

**ReviewPinsPanel.jsx**:
```jsx
// Shows in ChatShell alongside ConversationList
<ReviewPinsPanel>
  <PinFilter status={filter} onChange={setFilter} />
  
  <PinList>
    {pins.map(pin => (
      <PinCard 
        key={pin.id}
        pin={pin}
        onResolve={handleResolve}
        onReopen={handleReopen}
        onJumpToMessage={handleJump}
        onAddLink={handleAddLink}
        onRemoveLink={handleRemoveLink}
      />
    ))}
  </PinList>
</ReviewPinsPanel>
```

**PinCard.jsx**:
```jsx
<div className="pin-card">
  <div className="pin-header">
    <EntityBadge type={pin.matchedEntityType} name={pin.entityName} />
    <StatusBadge status={pin.status} />
  </div>
  
  <div className="pin-message-preview">
    "{pin.sourceMessage.body}"
  </div>
  
  <div className="pin-links">
    {pin.linkedDocuments.map(doc => (
      <DocumentChip 
        type={doc.linkType} 
        number={doc.documentNumber}
        onClick={() => navigateTo(`/${doc.linkType.toLowerCase()}s/${doc.documentId}`)}
      />
    ))}
    
    <Button onClick={onAddLink}>
      <PlusIcon /> Add Link
    </Button>
  </div>
  
  <div className="pin-actions">
    <Button onClick={() => onJumpToMessage(pin.sourceMessageId)}>
      Jump to Message
    </Button>
    
    {pin.status === 'OPEN' ? (
      <Button onClick={() => onResolve(pin.id)}>Resolve</Button>
    ) : (
      <Button onClick={() => onReopen(pin.id)}>Reopen</Button>
    )}
  </div>
</div>
```

### Permissions

**Review Pin Access**:
- ✅ Admin: Full access (view, create, resolve, add/remove links)
- ✅ Manager: Full access (view, create, resolve, add/remove links)
- ❌ User: No access to review pins
- ❌ Customer: Never see review pins or staff groups

**Authorization Middleware**:
```javascript
async canAccessReviewPins(req, res, next) {
  // Must be staff
  if (req.actorType !== 'staff') {
    return res.status(403).json({ error: 'Customers cannot access review pins' });
  }
  
  // Must be Admin or Manager
  if (!['admin', 'manager'].includes(req.userRole)) {
    return res.status(403).json({ error: 'Only Admin and Manager can access review pins' });
  }
  
  next();
}
```

### Audit Logging

**Pin Events**:
```javascript
// Pin created (automatic)
{
  action: 'chat.pin.created',
  entity: 'ChatReviewPin',
  entityId: pinId,
  userId: senderUserId,
  changes: {
    entityType: 'CUSTOMER',
    entityId: customerId,
    messageId: sourceMessageId,
    conversationId: conversationId
  }
}

// Pin resolved
{
  action: 'chat.pin.resolved',
  entity: 'ChatReviewPin',
  entityId: pinId,
  userId: resolverUserId,
  changes: {
    status: { from: 'OPEN', to: 'RESOLVED' },
    resolvedAt: timestamp
  }
}

// Link added
{
  action: 'chat.pin.link.added',
  entity: 'ChatReviewPinLink',
  entityId: linkId,
  userId: adderUserId,
  changes: {
    pinId: pinId,
    linkType: 'INVOICE',
    documentId: invoiceId
  }
}

// Link removed
{
  action: 'chat.pin.link.removed',
  entity: 'ChatReviewPinLink',
  entityId: linkId,
  userId: removerUserId,
  changes: {
    pinId: pinId,
    linkType: 'INVOICE',
    documentId: invoiceId
  }
}
```

### Implementation Notes

1. **Do NOT store context messages**: Pin only stores the single `sourceMessageId`. UI retrieves surrounding messages via normal pagination.

2. **Avoid false positives**: 
   - Require exact full name match or token boundary match
   - Ignore extremely short names (< 3 characters) unless combined with another identifier
   - Use case-insensitive, normalized matching

3. **Arabic Support**: Normalize Arabic text by removing diacritics for better matching

4. **Performance**: 
   - Scan runs asynchronously after message creation (non-blocking)
   - Cache customer/user names in memory for faster scanning
   - Limit to STAFF_GROUP only (no scanning in CUSTOMER_DM)

5. **Duplicate Prevention**: 
   - Don't create duplicate pins for same entity in same message
   - Allow multiple pins per message if multiple entities mentioned

---

## 📁 Updated File Structure

### Additional Backend Files (Review Pins)

**New Models**:
```
src/database/models/
  ChatReviewPin.js            [NEW]
  ChatReviewPinLink.js        [NEW]
```

**Migrations**:
```
src/database/migrations/
  YYYYMMDDHHMMSS-create-chat-review-pins.js      [NEW]
  YYYYMMDDHHMMSS-create-chat-review-pin-links.js [NEW]
```

**Services**:
```
src/modules/chat/
  pin.service.js              [NEW] - Review pin logic
```

**Routes**:
```
src/routes/v1/
  chat.pins.routes.js         [NEW] - Review pin endpoints
```

### Additional Frontend Files (Review Pins)

```
frontend/src/pages/Chat/
  ReviewPinsPanel.jsx         [NEW]
  PinCard.jsx                 [NEW]
  PinDocumentLinks.jsx        [NEW]
  AddPinLinkModal.jsx         [NEW]
  
frontend/src/services/
  pinApi.js                   [NEW] - Review pin API calls
```

---

## 🚀 Updated Implementation Timeline

### Part 1: Database (Day 1 - 5 hours)
- Create 3 chat models + 2 review pin models
- Create 6 migrations (4 chat + 2 pins + customer auth)
- Test migrations
- Seed test data

### Part 2: Backend Services (Day 1-2 - 8 hours)
- Create chat.service.js
- Create pin.service.js
- Implement mention detection
- **Add early auth tests**
- Add customer auth endpoints

### Part 3: REST API (Day 2-3 - 7 hours)
- Create chat controller + routes
- Create pin controller + routes
- Add validators
- Add audit logging
- Test with Postman

### Part 4: Socket.IO (Day 3-4 - 6 hours)
- Set up Socket.IO server
- Implement socket auth
- Implement chat events
- Test with socket client

### Part 5: Frontend UI (Day 4-5 - 10 hours)
- Create all React components
- Create Review Pins panel
- Style with CSS
- Add routing
- Manual testing

### Part 6: Integration & Testing (Day 5-6 - 8 hours)
- Connect socket to UI
- Write comprehensive automated tests
- Security testing
- Bug fixes

**Total Estimated Time**: 6-7 days (44 hours)

---

**SPECIFICATION APPROVED AND READY FOR IMPLEMENTATION** ✅
