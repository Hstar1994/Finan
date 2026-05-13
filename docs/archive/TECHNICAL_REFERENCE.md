# Finan — Technical Reference

> Everything you need to know to develop, run, test, and deploy this project.  
> Updated April 11, 2026.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Database](#database)
6. [Backend API](#backend-api)
7. [Authentication & Authorization](#authentication--authorization)
8. [Real-time (Socket.IO)](#real-time-socketio)
9. [Frontend](#frontend)
10. [Docker](#docker)
11. [Testing](#testing)
12. [CI/CD](#cicd)
13. [NPM Scripts](#npm-scripts)
14. [Coding Conventions](#coding-conventions)
15. [Known Gaps & TODOs](#known-gaps--todos)

---

## Quick Start

```bash
# 1. Clone & enter project
cd Finan

# 2. Copy env files
cp .env.example .env
cp frontend/.env.example frontend/.env

# 3. Start everything (Postgres + Backend + Frontend)
docker-compose up -d

# 4. Run migrations & seed data
docker exec finan-backend npm run db:migrate
docker exec finan-backend npm run db:seed

# 5. Open browser
#    Frontend:  http://localhost:8080
#    API:       http://localhost:3000/api/v1
#    Swagger:   http://localhost:3000/api-docs
#    Health:    http://localhost:3000/api/health
```

**Default seed users** (created by `db:seed`):

| Email | Password | Role |
|-------|----------|------|
| admin@finan.com | admin123 | admin |
| manager@finan.com | manager123 | manager |
| user@finan.com | user123 | user |

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 18 (Alpine Docker) |
| Framework | Express | 4.18 |
| Database | PostgreSQL | 15 (Alpine Docker) |
| ORM | Sequelize | 6.35 |
| Auth | jsonwebtoken + bcryptjs | JWT Bearer tokens |
| Real-time | Socket.IO | 4.8 |
| Frontend | React | 18.2 |
| Bundler | Vite | 5.4 |
| Routing | React Router | 6.20 |
| HTTP Client | Axios | 1.13 |
| Validation (backend) | express-validator | 7.0 |
| Validation (frontend) | yup | 1.7 |
| Logging | Winston | 3.11 |
| API Docs | swagger-jsdoc + swagger-ui-express | — |
| Testing | Jest + Supertest | 30.2 / 7.1 |
| CI | GitHub Actions | — |
| Container | Docker + docker-compose | — |

---

## Project Structure

```
Finan/
├── src/                          # Backend
│   ├── server.js                 # Entry point — Express + HTTP + Socket.IO
│   ├── config/
│   │   ├── index.js              # ALL environment config (single source of truth)
│   │   └── swagger.js            # Swagger/OpenAPI config
│   ├── database/
│   │   ├── connection.js         # Sequelize instance + testConnection()
│   │   ├── models/               # 16 Sequelize models + index.js (associations)
│   │   ├── migrations/           # Sequelize migrations
│   │   ├── migrate.js            # Run migrations
│   │   ├── rollback.js           # Rollback migrations (with production safety)
│   │   ├── status.js             # Show migration status
│   │   ├── seed.js               # Seed demo data
│   │   ├── add-indexes.js        # Create DB indexes
│   │   └── init-sequences.js     # Init auto-number sequences
│   ├── middleware/
│   │   ├── auth.js               # authenticate() + authorize()
│   │   ├── permissions.js        # requirePermission/Role/Admin helpers
│   │   ├── chatAuth.js           # Customer JWT auth for chat
│   │   ├── auditLogger.js        # Auto audit-log middleware
│   │   ├── errorHandler.js       # Global error handler
│   │   ├── rateLimiter.js        # Rate limiting
│   │   ├── requestId.js          # UUID correlation IDs
│   │   └── requestLogger.js      # HTTP request logging (Morgan)
│   ├── modules/                  # Feature modules (controller + service + routes)
│   │   ├── auth/                 # Login, register, token refresh, password
│   │   ├── users/                # User CRUD (admin)
│   │   ├── customers/            # Customer CRUD + balance
│   │   ├── invoices/             # Invoice lifecycle
│   │   ├── quotes/               # Quote lifecycle
│   │   ├── receipts/             # Payment receipts
│   │   ├── items/                # Product/service catalog
│   │   ├── creditNotes/          # Credit notes (routes exist, logic incomplete)
│   │   ├── chat/                 # Chat conversations + messages
│   │   └── audit/                # Audit log queries
│   ├── routes/
│   │   ├── index.js              # /health + mounts /v1 + deprecated fallback
│   │   └── v1/index.js           # All /api/v1/* route registration
│   ├── socket/
│   │   ├── index.js              # Socket.IO server init + CORS
│   │   ├── handlers/chat.handlers.js  # Chat events (join, leave, send, typing)
│   │   └── middleware/auth.js    # Socket JWT authentication
│   ├── utils/
│   │   ├── logger.js             # Winston logger (file rotation + console)
│   │   ├── apiResponse.js        # Standardized API response helpers
│   │   ├── numberGenerator.js    # Auto-numbering (INV-, QUO-, REC-)
│   │   └── permissions.js        # Permission definitions + helpers
│   └── validators/               # express-validator schemas per module
│
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── main.jsx              # Entry — ErrorBoundary → App
│   │   ├── App.jsx               # Routes + AuthProvider + Layout
│   │   ├── config/env.js         # Frontend config (VITE_API_URL, etc.)
│   │   ├── contexts/             # AuthContext (JWT, login/logout, user state)
│   │   ├── services/             # Axios API clients
│   │   ├── pages/                # Route components (Dashboard, Invoices, Chat…)
│   │   ├── components/           # Layout, Header, Sidebar, ErrorBoundary, etc.
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Frontend utilities
│   │   └── validators/           # yup schemas
│   ├── Dockerfile                # Nginx-based production build
│   ├── nginx.conf                # SPA routing, caching headers
│   ├── vite.config.js            # Vite build config
│   └── package.json
│
├── tests/                        # Backend tests
│   ├── setup.js                  # Jest setup (env, hooks, cleanup)
│   ├── setupTestDb.js            # Create test database
│   ├── factories/index.js        # Data factories (User, Customer, Invoice…)
│   ├── helpers/
│   │   ├── testDb.js             # Test DB utilities
│   │   └── authHelper.js         # Generate test tokens
│   └── __tests__/                # Test files organized by module
│
├── docs/                         # Documentation (this folder)
│   ├── TECHNICAL_REFERENCE.md    # THIS FILE
│   ├── PROJECT_ROADMAP.md        # Status, priorities, what's next
│   ├── ARCHITECTURE.md           # System architecture diagrams
│   ├── CLEANUP_PHASE.md          # Sprint 1-3 tracking (complete)
│   ├── CHAT_FEATURE_SPEC.md      # Chat feature specification
│   ├── SENIOR_ENGINEER_REVIEW.md # Code audit & recommendations
│   └── archive/                  # Older session logs, phase summaries
│
├── .github/workflows/            # CI/CD
│   ├── ci.yml                    # Main pipeline (lint → test → build)
│   └── test.yml                  # PR test workflow
│
├── docker-compose.yml            # Dev: postgres + backend + frontend
├── Dockerfile                    # Multi-stage (deps → dev → production)
├── .env.example                  # Backend env template
├── secrets/                      # Docker secrets for production
├── jest.config.js                # Jest configuration
└── package.json                  # Backend dependencies + scripts
```

---

## Environment Variables

### Backend (.env)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |
| `PORT` | No | `3000` | Express server port |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host (`postgres` in Docker) |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | Yes | `finan_db` | Database name |
| `DB_USER` | Yes | `finan` | Database user |
| `DB_PASSWORD` | Yes | `finan123` | Database password |
| `DB_POOL_MAX` | No | `5` (dev) / `20` (prod) | Max DB connections |
| `DB_POOL_MIN` | No | `2` | Min idle connections |
| `JWT_SECRET` | **Yes** | — | **Change in production!** JWT signing key |
| `JWT_EXPIRES_IN` | No | `24h` | Token expiry (e.g., `1h`, `7d`) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `CORS_ORIGIN` | No | localhost variants | Comma-separated allowed origins |
| `FRONTEND_URL` | No | `http://localhost:8080` | Frontend URL (for Socket.IO CORS) |
| `LOG_LEVEL` | No | `info` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `CONFIRM_ROLLBACK` | No | — | Set to `yes` to allow rollback in production |

### Frontend (frontend/.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3000/api` | Backend API base URL |
| `VITE_APP_NAME` | `Finan` | App title |
| `VITE_APP_VERSION` | `1.0.0` | Displayed version |

> **LAN testing**: Set `VITE_API_URL=http://<your-ip>:3000/api` and add the IP to `CORS_ORIGIN` in backend .env.

---

## Database

### Models (16 total)

| Model | Table | Key Fields |
|-------|-------|------------|
| **User** | users | email, password, firstName, lastName, role (admin/manager/user), isActive |
| **Customer** | customers | name, email, phone, balance, creditLimit, password (optional, for portal) |
| **Item** | items | name, sku, category, unitPrice, taxRate, stockQuantity |
| **Invoice** | invoices | invoiceNumber (INV-XXXXXX), customerId, status, subtotal, tax, discount, total, dueDate |
| **InvoiceItem** | invoice_items | invoiceId, itemId, quantity, unitPrice, tax, total |
| **Quote** | quotes | quoteNumber (QUO-XXXXXX), customerId, status, expiryDate, subtotal, total |
| **QuoteItem** | quote_items | quoteId, itemId, quantity, unitPrice, tax, total |
| **Receipt** | receipts | receiptNumber (REC-XXXXXX), customerId, invoiceId, amount, paymentMethod |
| **CreditNote** | credit_notes | creditNoteNumber, customerId, invoiceId, status, total |
| **CreditNoteItem** | credit_note_items | creditNoteId, itemId, quantity, unitPrice, total |
| **AuditLog** | audit_logs | userId, action, entityType, entityId, changes, ipAddress, userAgent |
| **ChatConversation** | chat_conversations | title, type (CUSTOMER_DM/STAFF_GROUP/STAFF_DM), customerId |
| **ChatParticipant** | chat_participants | conversationId, userId, customerId, role, lastReadAt |
| **ChatMessage** | chat_messages | conversationId, senderUserId/senderCustomerId, content, messageType |
| **ChatReviewPin** | chat_review_pins | conversationId, sourceMessageId, status, entityType, entityId |
| **ChatReviewPinLink** | chat_review_pin_links | pinId, entityType, entityId |

### Key Relationships

- Customer → Invoices, Quotes, Receipts, CreditNotes (hasMany, RESTRICT delete)
- Invoice → InvoiceItems (CASCADE), Receipts (SET NULL), CreditNotes (SET NULL)
- ChatConversation → Participants, Messages, Pins (all CASCADE)
- All financial documents have `createdBy` → User (SET NULL)

### Auto-Numbering

Handled by `src/utils/numberGenerator.js` using PostgreSQL sequences:
- Invoices: `INV-000001`, `INV-000002`, ...
- Quotes: `QUO-000001`, ...
- Receipts: `REC-000001`, ...

### Migrations

```bash
npm run db:migrate          # Apply pending migrations
npm run db:rollback         # Rollback last migration
npm run db:rollback:all     # Rollback all migrations
npm run db:status           # Show executed/pending migrations
npm run db:seed             # Insert demo data
npm run db:indexes          # Add performance indexes
npm run db:init-sequences   # Initialize auto-number sequences
```

> **Production safety**: `db:rollback` requires `CONFIRM_ROLLBACK=yes` in production.

---

## Backend API

**Base URL**: `http://localhost:3000/api/v1`  
**Swagger Docs**: `http://localhost:3000/api-docs`

### Endpoints

| Prefix | Module | Key Operations |
|--------|--------|----------------|
| `/auth` | Authentication | `POST /login`, `POST /register`, `POST /refresh-token`, `POST /change-password` |
| `/users` | User Management | CRUD, stats, role updates (admin only) |
| `/customers` | Customers | CRUD, search, balance tracking |
| `/invoices` | Invoices | CRUD, status transitions, line items, payment recording |
| `/quotes` | Quotes | CRUD, status transitions, line items |
| `/receipts` | Receipts | CRUD, payment methods, customer balance updates |
| `/items` | Catalog | CRUD, SKU lookup, category filtering |
| `/credit-notes` | Credit Notes | Routes mounted but **logic is incomplete** |
| `/chat` | Chat | Conversations, messages, participants, read receipts |
| `/audit` | Audit Logs | Query by entity/action/user (admin only) |

### Response Format

All responses use a standardized format via `utils/apiResponse.js`:

```json
// Success
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}

// Error
{
  "success": false,
  "message": "Error description",
  "errors": [ ... ]   // Validation errors if applicable
}
```

### Request Headers

| Header | Value | When Required |
|--------|-------|---------------|
| `Authorization` | `Bearer <jwt_token>` | All protected routes |
| `Content-Type` | `application/json` | POST/PUT/PATCH requests |
| `X-Request-ID` | UUID (optional) | Auto-generated if not sent; returned in response |

---

## Authentication & Authorization

### JWT Flow

1. `POST /api/v1/auth/login` → returns `{ token, user }` (24h expiry by default)
2. Client sends `Authorization: Bearer <token>` on every request
3. `authenticate` middleware verifies token, loads user from DB, attaches to `req.user`
4. `authorize('admin', 'manager')` middleware checks `req.user.role`

### Roles & Permissions

| Role | Level | Can Do |
|------|-------|--------|
| `admin` | Full access | Everything. Manage users, view audit logs, all CRUD |
| `manager` | Business operations | CRUD on customers/invoices/quotes/receipts/items, manage chat |
| `user` | Basic operations | View/create own records, participate in chat |

Permission system defined in `src/utils/permissions.js` with granular per-module permissions.

Middleware helpers:
- `requirePermission('invoices:create')` — single permission
- `requireAnyPermission(['invoices:create', 'invoices:update'])` — any of
- `requireAllPermissions([...])` — all of
- `requireAdmin` — shortcut for admin-only
- `requireManagerOrAdmin` — shortcut

### Customer Auth (for chat portal)

Separate JWT strategy via `src/middleware/chatAuth.js`. Customer tokens contain `customerId` instead of `userId`. **Not yet fully integrated into a customer portal.**

---

## Real-time (Socket.IO)

**Server**: Initialized in `src/socket/index.js`, attached to the HTTP server.  
**Client**: `socket.io-client` in `frontend/src/pages/Chat.jsx`.

### Connection

```javascript
// Client connects to root namespace
const socket = io('http://localhost:3000', {
  auth: { token: '<jwt_token>' }
});
```

### Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:join` | Client → Server | Join a conversation room |
| `chat:leave` | Client → Server | Leave a conversation room |
| `chat:send-message` | Client → Server | Send a message |
| `chat:new-message` | Server → Client | Broadcast new message to room |
| `chat:typing` | Both | Typing indicator |
| `chat:conversation-created` | Server → Client | New conversation notification |
| `chat:conversation-deleted` | Server → Client | Conversation removed notification |

Socket authentication uses the same JWT as REST, verified in `src/socket/middleware/auth.js`.

---

## Frontend

### Stack

- **React 18** with class-based ErrorBoundary + functional components
- **Vite** for dev server + production builds
- **React Router 6** for client-side routing
- **Axios** for HTTP requests (configured in `services/apiClient.js`)
- **Socket.IO Client** for real-time chat
- **yup** for form validation
- **Context API** for auth state (`AuthContext`)

### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | JWT login form |
| `/dashboard` | Dashboard | Stats overview |
| `/customers` | Customers | Customer list + CRUD |
| `/invoices` | Invoices | Invoice management |
| `/quotes` | Quotes | Quote management |
| `/receipts` | Receipts | Payment recording |
| `/items` | Items | Product catalog |
| `/chat` | Chat | 3-panel chat interface |
| `/users` | Users | User management (admin) |
| `/audit-logs` | AuditLogs | Audit viewer (admin only) |

### Key Config

All frontend config flows through `frontend/src/config/env.js`:
```javascript
import { config } from './config/env';
config.apiUrl       // API base URL
config.isDevelopment // boolean
config.isProduction  // boolean
```

> **Important**: Use named import `{ config }` not default import. This was the source of a breaking bug in Jan 2026.

### Building

```bash
cd frontend
npm install
npm run build          # Production build → dist/
npm run dev            # Dev server on :5173
```

In Docker, the frontend is served by **Nginx** (see `frontend/nginx.conf` for SPA routing).

---

## Docker

### Architecture

```
docker-compose.yml
├── postgres      (postgres:15-alpine, port 5432, persistent volume)
├── backend       (development stage, port 3000, hot-reload via nodemon)
├── backend-prod  (production profile, non-root user, Docker secrets)
└── frontend      (Nginx, port 8080, serves Vite build)
```

### Common Commands

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run a command inside backend container
docker exec finan-backend npm run db:migrate

# Production mode (uses Docker secrets)
docker-compose --profile production up -d backend-prod

# Stop everything
docker-compose down

# Stop and remove volumes (DELETES DATA)
docker-compose down -v
```

### Docker Secrets (Production)

Place real secrets in:
- `secrets/db_password.txt` — database password
- `secrets/jwt_secret.txt` — JWT signing key

These are mounted at `/run/secrets/` in the production container and read by the entrypoint script.

### Dockerfile Stages

| Stage | Base | Purpose |
|-------|------|---------|
| `deps` | node:18-alpine | Install production-only deps (`npm ci --only=production`) |
| `development` | node:18-alpine | All deps + nodemon, hot reload |
| `production` | node:18-alpine | Non-root user, production deps only, `node src/server.js` |

---

## Testing

### Setup

```bash
# Install dependencies
npm install

# Create test database (one-time)
npm run test:setup-db

# Run all tests with coverage
npm test -- --coverage

# Run unit tests only
npm run test:unit

# Watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── setup.js              # Global hooks (set NODE_ENV=test, cleanup)
├── setupTestDb.js        # Creates finan_test_db if missing
├── factories/index.js    # Data factories for all models
├── helpers/
│   ├── testDb.js         # DB utilities (sync, clean, close)
│   └── authHelper.js     # Token generation for tests
└── __tests__/
    ├── auth/controller.test.js         (28 tests)
    ├── customers/controller.test.js    (21 tests)
    ├── invoices/controller.test.js     (22 tests)
    ├── users/controller.test.js        (27 tests)
    ├── items/controller.test.js        (17 tests)
    ├── receipts/controller.test.js     (22 tests)
    ├── chat/service.test.js            (53 tests)
    ├── auth/customerAuth.service.test.js (24 tests)
    ├── utils/permissions.test.js       (34 tests)
    ├── utils/logger.test.js            (17 tests)
    ├── middleware/auth.test.js          (13 tests)
    ├── middleware/permissions.test.js   (22 tests)
    └── middleware/errorHandler.test.js  (16 tests)
```

**Current**: 333 passing tests, 45.55% statement coverage.

### Coverage Gaps (areas with 0% coverage)

- Quote controller/service
- Credit note controller/service
- Socket.IO handlers (`chat.handlers.js`)
- Sequelize model methods/hooks
- Frontend components (no React Testing Library tests)
- `rateLimiter.js`, `chatAuth.js` middleware

### Writing a New Test

```javascript
const request = require('supertest');
const app = require('../../src/server'); // or build Express app
const { generateToken } = require('../helpers/authHelper');
const { buildUser } = require('../factories');

describe('GET /api/v1/your-module', () => {
  let token;

  beforeAll(() => {
    token = generateToken({ id: 'uuid', role: 'admin' });
  });

  it('should return 200 with data', async () => {
    const res = await request(app)
      .get('/api/v1/your-module')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## CI/CD

### GitHub Actions Pipelines

**ci.yml** — runs on push to `main`/`develop`/`feature/*` and PRs:

| Job | What It Does |
|-----|-------------|
| **lint** | `npm ci` → ESLint (continue on error) |
| **test** | Spins up Postgres 15 service → Jest with coverage → Upload to Codecov |
| **build** | Docker image build (push to `main`/`develop` only) |
| **summary** | Job results table in GitHub UI |

**test.yml** — lighter workflow for PRs only.

Both use Node 18 and npm caching.

---

## NPM Scripts

### Backend (root package.json)

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `node src/server.js` | Production start |
| `dev` | `nodemon src/server.js` | Development with hot-reload |
| `test` | `jest` | Run all tests |
| `test:watch` | `jest --watch` | Watch mode |
| `test:coverage` | `jest --coverage` | With coverage report |
| `test:unit` | `jest --testPathIgnorePatterns=integration` | Unit tests only |
| `test:setup-db` | `node tests/setupTestDb.js` | Create test database |
| `db:migrate` | `node src/database/migrate.js` | Run migrations |
| `db:rollback` | `node src/database/rollback.js` | Rollback last migration |
| `db:rollback:all` | `node src/database/rollback.js all` | Rollback all |
| `db:status` | `node src/database/status.js` | Migration status |
| `db:seed` | `node src/database/seed.js` | Seed demo data |
| `db:indexes` | `node src/database/add-indexes.js` | Add DB indexes |
| `db:init-sequences` | `node src/database/init-sequences.js` | Init number sequences |
| `audit` | `npm audit && cd frontend && npm audit` | Security audit both packages |

---

## Coding Conventions

### Backend

- **Module pattern**: Each feature in `src/modules/<name>/` has `controller.js`, `routes.js`, and optionally a `service.js` or `<name>.service.js`
- **Config**: Always import from `src/config` — never use `process.env` directly in business logic
- **Logging**: Use `const logger = require('../utils/logger')` with levels: `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()` — no `console.log`
- **Responses**: Use `ApiResponse.success(res, data, message, statusCode)` and `ApiResponse.error(res, message, errors, statusCode)` from `utils/apiResponse.js`
- **Validation**: Define schemas in `src/validators/<module>.validator.js` using express-validator
- **Error handling**: Throw errors or pass to `next(error)` — the global error handler catches everything
- **Transactions**: Use `sequelize.transaction()` for multi-step DB operations

### Frontend

- **Config import**: `import { config } from '../config/env'` (named export, NOT default)
- **API calls**: Use the configured Axios instance from `services/apiClient.js`
- **Auth state**: Access via `useAuth()` hook from `AuthContext`
- **Pages**: One component per page in `src/pages/`, mounted in `App.jsx`
- **No console.log**: Removed in cleanup; use `if (config.isDevelopment)` for debug output

### Git

- **Branch naming**: `feature/<name>`, `fix/<name>`, `hotfix/<name>`
- **Commit style**: Descriptive messages starting with module/task context
- **Main branch**: `main` — protected, merge via PR (CI must pass)

---

## Known Gaps & TODOs

These are things that are incomplete or need work. In priority order — see [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) for the full backlog.

### Must Do Before Production

| Item | Description | Effort |
|------|-------------|--------|
| **Merge cleanup branch** | `feature/cleanup-phase-improvements` has 12 tasks complete, not yet merged to `main` | 30 min |
| **Update README.md** | Currently outdated — missing cleanup phase features, Docker secrets, test info | 1 hour |
| **Lint warnings** | ESLint runs but `continue-on-error` in CI — fix warnings | 1-2 hours |
| **Test coverage → 70%** | Currently 45.55%. Missing: quotes controller, socket handlers, models | 2-3 days |

### Incomplete Features

| Feature | What Exists | What's Missing |
|---------|------------|----------------|
| **Credit Notes** | Model, migration, routes mounted | Controller logic, service, validators, frontend UI, tests |
| **Customer Portal** | Customer model has password/isActive fields, `chatAuth.js` exists | Login flow, portal UI, customer-facing pages |
| **Reports** | Nothing | Revenue reports, aging, charts, PDF/Excel export |

### Technical Debt

| Item | Details |
|------|---------|
| **CSP headers** | Helmet is enabled but no Content Security Policy configured |
| **Response compression** | No `compression` middleware installed |
| **Rate limit headers** | Not returning standard `RateLimit-*` headers to clients |
| **Load testing** | Never done — unknown performance limits |
| **Frontend tests** | 0% — no React Testing Library or Cypress/Playwright tests |
| **TypeScript** | Everything is plain JavaScript — consider migration for type safety |

### Optional / Future

| Feature | Notes |
|---------|-------|
| Redis caching | For frequently accessed data (customers, items) |
| Prometheus/Grafana | Monitoring + dashboards |
| Multi-currency | Currently no currency handling |
| Recurring invoices | Scheduled invoice generation |
| Email/SMS notifications | No notification system |
| Payment gateway | No payment processing integration |
| File uploads | Chat file sharing backend not implemented |

---

## Documentation Index

| Document | Location | Purpose |
|----------|----------|---------|
| **Technical Reference** | [docs/TECHNICAL_REFERENCE.md](TECHNICAL_REFERENCE.md) | This file — how to work on the project |
| **Project Roadmap** | [docs/PROJECT_ROADMAP.md](PROJECT_ROADMAP.md) | Status, priorities, what to work on next |
| **Architecture** | [docs/ARCHITECTURE.md](ARCHITECTURE.md) | System design diagrams and patterns |
| **Cleanup Phase** | [docs/CLEANUP_PHASE.md](CLEANUP_PHASE.md) | Detailed sprint 1-3 task log (complete) |
| **Chat Spec** | [docs/CHAT_FEATURE_SPEC.md](CHAT_FEATURE_SPEC.md) | Full chat feature specification |
| **Code Review** | [docs/SENIOR_ENGINEER_REVIEW.md](SENIOR_ENGINEER_REVIEW.md) | Audit findings and recommendations |
| **Archive** | [docs/archive/](archive/) | Old session logs and phase summaries |
