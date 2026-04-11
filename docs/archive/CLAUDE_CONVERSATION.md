# 💬 CLAUDE_CONVERSATION.md - Development Workflow & Context

> **⚠️ IMPORTANT**: Reference this for development workflows, project structure, and technical lessons.

**Last Updated**: December 29, 2025

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
├── archive/                     # Archived documentation
├── docker-compose.yml           # Docker orchestration
├── Dockerfile                   # Backend Docker image
├── package.json
├── README.md                    # GitHub README (public)
├── CLAUDE_PROGRESS.md          # Project status tracking
├── CLAUDE_CONVERSATION.md      # THIS FILE - Dev workflows
└── CLAUDE_SUGGESTED.md         # Improvements & suggestions
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

#### Backend Changes
- Edit files in `src/`
- Nodemon auto-restarts on save
- Check logs: `docker-compose logs -f backend`
- Test endpoints: http://localhost:3000/api-docs

#### Frontend Changes
- Edit files in `frontend/src/`
- Vite hot-reloads automatically
- Check browser console for errors
- Access at: http://localhost:8080

#### Database Changes
- Create migration: `src/database/migrations/YYYYMMDDHHMMSS-description.js`
- Run migration: `docker-compose exec backend npm run migrate`
- Or restart backend container to auto-migrate

### Git Workflow
```bash
# Check status
git status

# Stage changes
git add .
# Or stage specific files
git add path/to/file

# Commit with descriptive message
git commit -m "Feature: Clear description of changes"

# Push to remote
git push origin feature/chat-module

# Create PR when ready to merge to main
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

# Stop and remove everything
docker-compose down
docker-compose up -d --build
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

### Configuration
To change LAN IP, update:
- `docker-compose.yml` - VITE_API_URL, CORS_ORIGIN, FRONTEND_URL
- Rebuild: `docker-compose build --no-cache`

---

## 🎯 QUALITY CHECKLIST

Before considering a feature "complete":

### Code Quality
- [ ] No console.log() in production code
- [ ] Error handling implemented
- [ ] Input validation on all endpoints
- [ ] No hardcoded values (use config/env)

### Security
- [ ] Authentication required where needed
- [ ] Authorization checks in place
- [ ] SQL injection prevention (Sequelize)
- [ ] XSS prevention (React)
- [ ] CORS configured correctly

### Testing
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Cross-browser tested

### Documentation
- [ ] Code comments for complex logic
- [ ] API endpoints documented
- [ ] README updated if needed
- [ ] CLAUDE_PROGRESS.md updated

### Git
- [ ] Meaningful commit messages
- [ ] Changes pushed to remote
- [ ] PR created if merging to main

---

## 💡 LESSONS LEARNED

### React + Socket.IO
**Stale Closure Issue**
- Socket.IO event handlers capture state from when they're created
- Solution: Use `useRef` to maintain current state reference
```javascript
const selectedConversationRef = useRef(selectedConversation)
useEffect(() => {
  selectedConversationRef.current = selectedConversation
}, [selectedConversation])
// Use selectedConversationRef.current in Socket.IO handlers
```

**Optimistic Updates**
- Always match the most recent optimistic message
- Search backwards through messages array
```javascript
for (let i = prev.length - 1; i >= 0; i--) {
  if (prev[i].isOptimistic && prev[i].body === newMessage.body) {
    // Found the most recent one
    break
  }
}
```

**User Data in Broadcasts**
- Include full user objects in Socket.IO broadcasts
- Avoids "Unknown" sender names on first render
```javascript
// Fetch message with includes
const fullMessage = await ChatMessage.findByPk(id, {
  include: [
    { model: User, as: 'senderUser' },
    { model: Customer, as: 'senderCustomer' }
  ]
})
io.to(room).emit('new_message', { message: fullMessage.toJSON() })
```

### Docker + Vite
**Build Arguments**
- Use `ARG` in Dockerfile for build-time variables
```dockerfile
ARG VITE_API_URL=http://localhost:3000/api
ENV VITE_API_URL=${VITE_API_URL}
```

**Environment Variables**
- Set both build args AND runtime env vars
```yaml
build:
  args:
    - VITE_API_URL=http://192.168.8.12:3000/api
environment:
  - VITE_API_URL=http://192.168.8.12:3000/api
```

**CORS Configuration**
- Update CORS for LAN access in both:
  - Express (server.js)
  - Socket.IO (socket/index.js)

### Sequelize Best Practices
**Associations**
- Define all in one place (`models/index.js`)
- Avoids circular dependencies

**Soft Deletes**
- Use `deletedAt` field instead of hard deletes
- Maintains audit trail

**Transactions**
- Always use for multi-table operations
```javascript
const transaction = await sequelize.transaction()
try {
  // operations
  await transaction.commit()
} catch (error) {
  await transaction.rollback()
  throw error
}
```

### Code Organization
**Modular Structure**
- Keep features isolated: `modules/chat/`
- Each module has: service, controller, routes

**Separate Concerns**
- Services: Business logic
- Controllers: HTTP handling
- Routes: Endpoint definition
- Validators: Input validation

**Reusable Components**
- Create small, focused React components
- Single responsibility principle

---

## 📚 DOCUMENTATION REFERENCES

### External Documentation
- **Express**: https://expressjs.com/
- **Sequelize**: https://sequelize.org/
- **Socket.IO**: https://socket.io/docs/
- **React**: https://react.dev/
- **Vite**: https://vitejs.dev/

### Internal Documentation
- **API Docs**: http://localhost:3000/api-docs
- **Database Schema**: See `src/database/models/`
- **API Routes**: See `src/routes/`

### Archived Documents
All legacy documentation moved to `archive/`:
- Chat specs and progress tracking
- Phase completion documents
- Session logs
- Testing checklists
- Security audits

---

## 🔄 Common Tasks Quick Reference

### Add New Feature Module
1. Create `src/modules/feature-name/`
2. Add files: `service.js`, `controller.js`, `routes.js`
3. Register routes in `src/routes/index.js`
4. Add validators in `src/validators/`

### Add New Database Model
1. Create `src/database/models/ModelName.js`
2. Define associations in `src/database/models/index.js`
3. Create migration in `src/database/migrations/`
4. Run migration or restart backend

### Add New React Page
1. Create `frontend/src/pages/PageName.jsx`
2. Add route in `frontend/src/App.jsx`
3. Add navigation link in `frontend/src/components/Sidebar.jsx`

### Debug Socket.IO Issues
1. Check connection: Browser console → Network → WS tab
2. Check server logs: `docker-compose logs -f backend`
3. Verify auth token is being sent
4. Check CORS configuration
5. Verify user is joining rooms correctly

### Fix Docker Issues
```bash
# View container status
docker-compose ps

# View logs
docker-compose logs -f backend

# Restart specific service
docker-compose restart backend

# Full rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

**Last Updated**: December 29, 2025  
**Maintained by**: Claude & Development Team
