# 🤖 Claude.md - Finan Project Master Document

> **⚠️ IMPORTANT**: Keep this document updated with all completed work, pending tasks, and documentation notes.  
> This serves as the single source of truth for project status between development sessions.

**Project**: Finan - Financial Management System  
**Last Updated**: December 29, 2025  
**Current Branch**: `feature/chat-module`  
**Status**: Chat Feature Complete - Ready for Merge

---

## 📊 PROJECT OVERVIEW

Finan is a comprehensive financial management system similar to Refrens, featuring:
- Customer & invoice management
- Quote generation & receipts
- Real-time chat system
- Role-based access control (Admin, Manager, User)
- Docker-based deployment
- LAN/Wi-Fi access support

**Tech Stack**:
- **Backend**: Node.js, Express, Sequelize, PostgreSQL, Socket.IO
- **Frontend**: React 18, Vite, React Router 6
- **Database**: PostgreSQL 15 (Docker)
- **Real-time**: Socket.IO 4.8.1

---

## ✅ COMPLETED FEATURES

### 🔐 Core System (Phase 1 - COMPLETE)
- [x] JWT authentication with secure token management
- [x] Role-based access control (Admin, Manager, User)
- [x] Password hashing with bcrypt
- [x] Environment variable configuration
- [x] Docker setup (Backend, Frontend, PostgreSQL)
- [x] API documentation with Swagger
- [x] Rate limiting & security middleware
- [x] Comprehensive error handling
- [x] Request logging middleware

### 👥 Customer Management (COMPLETE)
- [x] Customer CRUD operations
- [x] Balance tracking
- [x] Credit limit management
- [x] Customer search & filtering
- [x] Email validation
- [x] Customer authentication fields (for future portal)

### 📄 Financial Documents (COMPLETE)
- [x] **Invoices**: Create, update, view, delete
  - [x] Automatic invoice numbering (INV-XXXXXX)
  - [x] Line items support
  - [x] Status tracking (draft, sent, paid, partial, overdue)
  - [x] Total calculations (subtotal, tax, discounts)
  - [x] Payment tracking
- [x] **Quotes**: Full quote management
  - [x] Automatic quote numbering (QUO-XXXXXX)
  - [x] Expiry date handling
  - [x] Status tracking (draft, sent, accepted, rejected)
  - [x] Convert to invoice capability (planned)
- [x] **Receipts**: Payment recording
  - [x] Automatic receipt numbering (REC-XXXXXX)
  - [x] Multiple payment methods (Cash, Bank Transfer, Card, Cheque, UPI, Other)
  - [x] Customer balance updates
  - [x] Invoice payment tracking
- [x] **Line Items**: Shared for invoices & quotes
  - [x] Quantity, price, tax calculations
  - [x] Discount support

### 🏷️ Items & Catalog (COMPLETE)
- [x] Item/product management
- [x] SKU tracking
- [x] Category organization
- [x] Tax rate configuration
- [x] Unit price management
- [x] Stock tracking fields

### 📊 Audit System (COMPLETE)
- [x] Comprehensive audit logging
- [x] Track all CRUD operations
- [x] User action tracking
- [x] IP address & user agent logging
- [x] Timestamp tracking
- [x] Entity change tracking
- [x] Query audit logs by entity, action, or user

### 🎨 Frontend (COMPLETE)
- [x] React 18 with Vite build system
- [x] React Router 6 for navigation
- [x] Protected routes with auth guards
- [x] Responsive design (mobile-friendly)
- [x] Dashboard with statistics
- [x] Customer management UI
- [x] Invoice management UI
- [x] Quote management UI
- [x] Receipt management UI
- [x] Items catalog UI
- [x] User management UI
- [x] Audit log viewer
- [x] Login/logout functionality
- [x] Profile management

### 💬 Chat Feature (COMPLETE - December 29, 2025)

#### Database & Models ✅
- [x] **ChatConversation** - Conversation management
  - Types: CUSTOMER_DM, STAFF_GROUP, STAFF_DM
  - Metadata support
  - Last message tracking
- [x] **ChatParticipant** - User participation tracking
  - Dual participant support (User OR Customer)
  - Join/leave timestamps
  - Read receipts (lastReadMessageId)
- [x] **ChatMessage** - Message storage
  - Types: TEXT, SYSTEM, DOCUMENT, FILE
  - Sender tracking (User OR Customer)
  - Edit/delete capability (soft delete)
  - 5000 character limit
- [x] **ChatReviewPin** - Entity mention tracking
  - Customer/User mention detection
  - Status tracking (open/resolved)
  - Document linking support
- [x] **ChatReviewPinLink** - Document attachments
  - Link invoices, quotes, receipts to conversations

#### Backend Services ✅
- [x] Chat service with business logic
  - Conversation creation (with idempotency for CUSTOMER_DM)
  - Message sending & retrieval
  - Participant management (add/remove)
  - Read receipt tracking
  - Entity mention scanning
  - Review pin management
- [x] REST API endpoints
  - `POST /chat/conversations` - Create conversation
  - `GET /chat/conversations` - List conversations
  - `GET /chat/conversations/:id/messages` - Get messages
  - `POST /chat/conversations/:id/messages` - Send message (REST fallback)
  - `POST /chat/conversations/:id/read` - Mark as read
  - `DELETE /chat/conversations/:id` - Delete conversation (soft delete)
  - `POST /chat/conversations/:id/share/invoice` - Share invoice
  - `POST /chat/conversations/:id/share/quote` - Share quote
  - Pin management endpoints (get, resolve, reopen, link, unlink)
- [x] Authentication middleware
  - JWT validation for both staff and customers
  - Conversation access control
  - Type-based access enforcement
- [x] Audit logging for chat actions

#### Real-time Socket.IO ✅
- [x] Socket.IO server setup
  - CORS configuration
  - Authentication middleware
  - Connection handling
- [x] Chat event handlers
  - `join_conversation` - Join conversation room
  - `leave_conversation` - Leave conversation room
  - `send_message` - Real-time message sending
  - `mark_read` - Read receipt broadcast
  - `typing` - Typing indicators
- [x] Message broadcasting
  - Broadcast to conversation participants
  - Include full user data (senderUser/senderCustomer)
  - Conversation sync (create/delete events)
- [x] Personal user rooms
  - Users join `user:userId` room on connect
  - Receive conversation updates in real-time

#### Frontend Chat UI ✅
- [x] Chat page component
  - Three-panel layout (sidebar, chat, details)
  - Conversation list with search
  - Message display area
  - Input box with send button
- [x] New conversation modal
  - User selection with search/filter
  - Staff-only group creation
  - User avatars and info
- [x] Real-time messaging
  - Socket.IO integration
  - Optimistic UI updates (instant feedback)
  - Message deduplication
  - Proper optimistic→real message replacement
- [x] Message rendering
  - Sent vs received message styling
  - Sender name display (on received messages)
  - Timestamp formatting
  - System message support
  - Document message support
- [x] Conversation management
  - Create new conversations
  - Delete conversations (with confirmation)
  - Real-time conversation list updates
  - Auto-select on creation
- [x] Typing indicators (structure ready)
- [x] Connection status indicator
- [x] Scroll to bottom on new messages
- [x] Error handling & user feedback

#### Bug Fixes & Optimizations ✅
- [x] Fixed stale closure in Socket.IO event handlers (useRef pattern)
- [x] Fixed duplicate messages issue (backward search for optimistic messages)
- [x] Fixed "Unknown" sender names (include full user data in broadcasts)
- [x] Fixed message field names (senderUserId, messageType)
- [x] Fixed real-time conversation sync (broadcast create/delete events)
- [x] Fixed delete conversation endpoint (soft delete implementation)
- [x] Added sender name display above received messages
- [x] Added optimistic message visual feedback (opacity + pulse)

#### Configuration ✅
- [x] LAN/Wi-Fi access configuration
  - Frontend API URL: `http://192.168.8.12:3000/api`
  - Backend CORS: Allow LAN IP
  - Socket.IO FRONTEND_URL: LAN IP support
  - Build args for Vite environment variables

---

## 🚧 PENDING / INCOMPLETE FEATURES

### Chat Feature - Phase 2 (Optional)
- [ ] **Customer Portal** - Allow customers to log in and chat
  - [ ] Customer authentication endpoints
  - [ ] Customer login UI
  - [ ] Customer chat interface
- [ ] **Document Sharing in Chat** - Rich embedded cards
  - [ ] Invoice card preview in messages
  - [ ] Quote card preview in messages
  - [ ] Click to view full document
- [ ] **Review Pin UI** - Frontend for review pins
  - [ ] Display pins in sidebar
  - [ ] Create/resolve pins
  - [ ] Link documents to pins
- [ ] **File Uploads** - Share files in chat
  - [ ] File upload endpoint
  - [ ] File storage (local or S3)
  - [ ] File message rendering
- [ ] **Message Editing** - Edit sent messages
  - [ ] Edit UI
  - [ ] Edit history tracking
- [ ] **Message Reactions** - Emoji reactions
- [ ] **Voice Messages** - Record and send audio
- [ ] **Typing Indicators** - Show when someone is typing (backend ready)
- [ ] **Read Receipts UI** - Show who read messages
- [ ] **Message Search** - Search within conversations
- [ ] **Message Notifications** - Browser notifications

### Credit Notes (Phase 3)
- [ ] Credit note model & migrations
- [ ] Credit note CRUD endpoints
- [ ] Link credit notes to invoices
- [ ] Update invoice totals when credit note issued
- [ ] Frontend credit note UI

### Reports & Analytics (Future)
- [ ] Sales reports
- [ ] Customer payment history
- [ ] Overdue invoice reports
- [ ] Revenue charts & graphs
- [ ] Export to PDF/Excel

### Advanced Features (Future)
- [ ] Multi-currency support
- [ ] Recurring invoices
- [ ] Email integration (send invoices via email)
- [ ] SMS notifications
- [ ] Payment gateway integration
- [ ] Tax calculation automation
- [ ] Inventory management
- [ ] Purchase orders
- [ ] Vendor management
- [ ] Expense tracking

---

## 🐛 KNOWN ISSUES

### Current Issues
_No known critical issues as of December 29, 2025_

### Fixed Issues (Recent)
- ✅ Duplicate optimistic messages (Dec 29)
- ✅ Sender names showing "Unknown" (Dec 29)
- ✅ Messages not persisting through refresh (Dec 29)
- ✅ Conversation sync not working across users (Dec 29)
- ✅ Delete conversation not working (Dec 29)
- ✅ Stale closure in Socket.IO handlers (Dec 29)

---

## 📝 NEXT STEPS

### Immediate (This Week)
1. **Merge `feature/chat-module` to `main`**
   - Review all changes
   - Test in production-like environment
   - Create PR and merge
   - Update main branch deployment

2. **Update README.md**
   - Add chat feature to features list
   - Update screenshots (if applicable)
   - Add Socket.IO to tech stack
   - Update setup instructions

3. **Documentation Cleanup**
   - Archive old progress documents
   - Update API documentation with chat endpoints
   - Create user guide for chat feature

### Short Term (Next 2 Weeks)
4. **Testing & QA**
   - Comprehensive manual testing
   - Load testing for Socket.IO
   - Security audit for chat endpoints
   - Cross-browser testing

5. **Deployment Preparation**
   - Production environment setup
   - Database migration scripts
   - Backup strategy
   - Monitoring setup

### Medium Term (Next Month)
6. **Customer Portal** (if required)
   - Customer authentication
   - Customer dashboard
   - Customer chat interface
   - Self-service features

7. **Advanced Chat Features**
   - Document sharing with previews
   - File uploads
   - Message search
   - Notifications

---

## 🗂️ PROJECT STRUCTURE

```
Finan/
├── src/                          # Backend source code
│   ├── config/                   # Configuration files
│   ├── database/                 # Database setup & models
│   │   ├── models/              # Sequelize models
│   │   │   ├── User.js
│   │   │   ├── Customer.js
│   │   │   ├── Invoice.js
│   │   │   ├── Quote.js
│   │   │   ├── Receipt.js
│   │   │   ├── Item.js
│   │   │   ├── AuditLog.js
│   │   │   ├── ChatConversation.js
│   │   │   ├── ChatParticipant.js
│   │   │   ├── ChatMessage.js
│   │   │   ├── ChatReviewPin.js
│   │   │   └── ChatReviewPinLink.js
│   │   └── migrations/          # Database migrations
│   ├── middleware/              # Express middleware
│   │   ├── auth.js             # JWT authentication
│   │   ├── permissions.js      # RBAC
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── modules/                 # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── customers/
│   │   ├── invoices/
│   │   ├── quotes/
│   │   ├── receipts/
│   │   ├── items/
│   │   ├── audit/
│   │   └── chat/               # Chat feature
│   │       ├── chat.service.js
│   │       ├── controller.js
│   │       └── routes.js
│   ├── socket/                  # Socket.IO setup
│   │   ├── index.js
│   │   ├── handlers/
│   │   │   └── chat.handlers.js
│   │   └── middleware/
│   │       └── auth.js
│   ├── routes/                  # API routes
│   ├── utils/                   # Utilities
│   └── validators/              # Input validation
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── NewConversationModal.jsx
│   │   ├── pages/              # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Invoices.jsx
│   │   │   ├── Quotes.jsx
│   │   │   ├── Receipts.jsx
│   │   │   ├── Items.jsx
│   │   │   ├── Users.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   └── Chat.jsx        # Chat page
│   │   ├── services/           # API clients
│   │   ├── contexts/           # React contexts
│   │   └── config/             # Frontend config
│   └── Dockerfile
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Backend Docker image
├── package.json
└── README.md                    # GitHub README (public)
```

---

## 🔧 DEVELOPMENT WORKFLOW

### Starting Development
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Stop services
docker-compose down
```

### Making Changes

1. **Backend Changes**:
   - Edit files in `src/`
   - Nodemon auto-restarts on save
   - Check logs: `docker-compose logs -f backend`

2. **Frontend Changes**:
   - Edit files in `frontend/src/`
   - Vite hot-reloads automatically
   - Check browser console for errors

3. **Database Changes**:
   - Create migration file in `src/database/migrations/`
   - Run: `docker-compose exec backend npm run migrate`
   - Or restart backend container

### Git Workflow
```bash
# Check status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "Feature: Description of changes"

# Push to remote
git push origin feature/chat-module

# Create PR when ready to merge
```

### Rebuilding Containers
```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build

# Full rebuild (removes cached layers)
docker-compose build --no-cache
```

---

## 🌐 ACCESS INFORMATION

### Local Access
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Database**: localhost:5432

### LAN/Wi-Fi Access (Same Network)
- **Frontend**: http://192.168.8.12:8080
- **Backend API**: http://192.168.8.12:3000
- **Socket.IO**: ws://192.168.8.12:3000

### Default Credentials
_To be documented after first deployment_

---

## 📚 DOCUMENTATION REFERENCES

### Created Documents (To Be Archived)
- `CHAT_FEATURE_SPEC.md` - Original chat feature specification
- `CHAT_IMPLEMENTATION_PROGRESS.md` - Implementation tracking
- `IMPLEMENTATION_CHECKLIST.md` - Phase 1 & 2 checklist
- `TESTING_CHECKLIST.md` - Manual testing guide
- `FRONTEND_COMPLETE.md` - Frontend completion notes
- `PHASE1_COMPLETE.md` - Phase 1 completion notes
- `PHASE2_COMPLETE.md` - Phase 2 completion notes
- `WEEK4_COMPLETE.md` - Week 4 progress
- `SESSION_LOG.md` - Session notes
- `SESSION_DEC16_2025.md` - Specific session log
- `SECURITY_AUDIT.md` - Security review
- `DOCKER_STATUS.md` - Docker setup notes
- `DEPLOYMENT.md` - Deployment guide
- `ARCHITECTURE.md` - System architecture
- `API_TESTING.md` - API testing notes
- `TESTING_SUMMARY.md` - Test results
- `SUMMARY.md` - Project summary
- `SUGGESTED_CHANGES.md` - Improvement suggestions

### Keep Active
- `README.md` - GitHub repository README (public-facing)
- `Claude.md` - **THIS FILE** (master reference)

---

## 🎯 QUALITY CHECKLIST

Before considering a feature "complete", ensure:

- [ ] **Code Quality**
  - [ ] No console.log() in production code
  - [ ] Error handling implemented
  - [ ] Input validation on all endpoints
  - [ ] No hardcoded values (use config/env)

- [ ] **Security**
  - [ ] Authentication required where needed
  - [ ] Authorization checks in place
  - [ ] SQL injection prevention (Sequelize handles this)
  - [ ] XSS prevention (React handles this)
  - [ ] CORS configured correctly

- [ ] **Testing**
  - [ ] Manual testing completed
  - [ ] Edge cases tested
  - [ ] Error scenarios tested
  - [ ] Cross-browser tested (if frontend)

- [ ] **Documentation**
  - [ ] Code comments for complex logic
  - [ ] API endpoints documented
  - [ ] README updated if needed
  - [ ] This file (Claude.md) updated

- [ ] **Git**
  - [ ] Meaningful commit messages
  - [ ] Changes pushed to remote
  - [ ] PR created if merging to main

---

## 💡 LESSONS LEARNED

### React + Socket.IO
- **Stale Closure Issue**: Socket.IO event handlers capture state from when they're created. Use `useRef` to maintain current state reference.
- **Optimistic Updates**: Always match the most recent optimistic message when replacing with real data (search backwards).
- **User Data in Broadcasts**: Include full user objects in Socket.IO broadcasts to avoid "Unknown" sender names.

### Docker + Vite
- **Build Args**: Use `ARG` in Dockerfile to accept build-time variables.
- **Environment Variables**: Set both build args and runtime env vars for Vite to work correctly.
- **CORS**: Remember to update CORS for LAN access in both Express and Socket.IO configs.

### Sequelize
- **Associations**: Define all associations in one place (`models/index.js`) to avoid circular dependencies.
- **Soft Deletes**: Use `deletedAt` field instead of hard deletes for audit trail.
- **Transactions**: Always use transactions for operations that modify multiple tables.

### Code Organization
- **Modular Structure**: Keep features isolated in their own modules (`modules/chat/`).
- **Separate Concerns**: Services for business logic, controllers for HTTP handling, routes for endpoint definition.
- **Reusable Components**: Create small, focused React components that can be reused.

---

## 📞 SUPPORT & RESOURCES

### Documentation
- **Express**: https://expressjs.com/
- **Sequelize**: https://sequelize.org/
- **Socket.IO**: https://socket.io/docs/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/

### Internal Docs
- API Documentation: http://localhost:3000/api-docs (when running)
- Database Schema: See `src/database/models/` files
- API Routes: See `src/routes/` files

---

## 🔄 UPDATE LOG

| Date | Update | Author |
|------|--------|--------|
| Dec 29, 2025 | Created consolidated Claude.md document | Claude |
| Dec 29, 2025 | Chat feature completed and documented | Claude |
| Dec 29, 2025 | LAN access configuration added | Claude |

---

**Last Updated**: December 29, 2025  
**Next Review**: Before merging to main branch

---

> 💡 **Remember**: Always update this document when:
> - Completing a feature
> - Adding new tasks
> - Fixing bugs
> - Making architectural decisions
> - Discovering issues or lessons learned
