# Finan - Financial Management System

A full-stack financial management application built with Node.js, Express, PostgreSQL, React, and Socket.IO. Manage customers, invoices, quotes, receipts, and communicate in real-time — all with role-based access control and Docker deployment.

## Quick Start

```bash
# Clone & enter project
git clone https://github.com/Hstar1994/Finan.git
cd Finan

# Copy environment files
cp .env.example .env
cp frontend/.env.example frontend/.env

# Start all services (Postgres + Backend + Frontend)
docker-compose up -d

# Run migrations and seed demo data
docker exec finan-backend npm run db:migrate
docker exec finan-backend npm run db:seed
```

Open in your browser:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api-docs |
| Health Check | http://localhost:3000/api/health |

**Default Logins:**

| Email | Password | Role |
|-------|----------|------|
| admin@finan.com | admin123 | Admin |
| manager@finan.com | manager123 | Manager |
| user@finan.com | user123 | User |

## Features

- **Customer Management** — CRUD, balance tracking, credit limits, search/filter
- **Invoices** — Full lifecycle with auto-numbering (INV-XXXXXX), line items, status tracking, tax/discount calculations
- **Quotes** — Auto-numbering (QUO-XXXXXX), expiry dates, status transitions
- **Receipts** — Auto-numbering (REC-XXXXXX), multiple payment methods, customer balance updates
- **Items Catalog** — SKU, categories, tax rates, stock tracking
- **Real-Time Chat** — Socket.IO messaging, 3-panel UI, conversation management, review pins
- **Audit System** — Full audit trail on all CRUD operations with IP/user agent tracking
- **Authentication** — JWT with role-based access control (Admin, Manager, User)
- **API Documentation** — Swagger/OpenAPI at `/api-docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18, Express 4.18 |
| Database | PostgreSQL 15, Sequelize 6.35 |
| Frontend | React 18, Vite 5, React Router 6 |
| Real-Time | Socket.IO 4.8 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Logging | Winston (structured, file rotation) |
| Testing | Jest 30, Supertest 7 |
| CI/CD | GitHub Actions |
| Deployment | Docker, docker-compose, multi-stage builds |

## Local Development (Without Docker)

```bash
# Install backend dependencies
npm install

# Start only Postgres via Docker
docker-compose up -d postgres

# Copy and edit environment
cp .env.example .env

# Setup database
npm run db:migrate
npm run db:seed

# Start backend (hot-reload via nodemon)
npm run dev

# In another terminal — start frontend
cd frontend
npm install
npm run dev
```

## Available Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm start` | Production server |
| `npm run dev` | Development with hot-reload (nodemon) |
| `npm test` | Run all tests |
| `npm run test:coverage` | Tests with coverage report |
| `npm run test:unit` | Unit tests only |
| `npm run test:watch` | Watch mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:rollback` | Rollback last migration |
| `npm run db:status` | Show migration status |
| `npm run db:seed` | Seed demo data |
| `npm run db:indexes` | Add performance indexes |

### Docker

```bash
docker-compose up -d                    # Start all services
docker-compose up -d --build            # Rebuild and start
docker-compose logs -f backend          # View backend logs
docker exec finan-backend npm run <cmd> # Run command in backend container
docker-compose down                     # Stop all
docker-compose down -v                  # Stop and delete data
```

### Production Mode

```bash
# Uses Docker secrets for passwords/JWT (see secrets/ folder)
docker-compose --profile production up -d backend-prod
```

## API Endpoints

All endpoints are under `/api/v1`. Authentication via `Authorization: Bearer <token>` header.

| Module | Prefix | Key Operations |
|--------|--------|----------------|
| Auth | `/auth` | login, register, refresh-token, change-password |
| Users | `/users` | CRUD, stats (admin only) |
| Customers | `/customers` | CRUD, search, balance management |
| Invoices | `/invoices` | CRUD, status transitions, line items |
| Quotes | `/quotes` | CRUD, status transitions, line items |
| Receipts | `/receipts` | CRUD, payment methods |
| Items | `/items` | CRUD, SKU lookup, categories |
| Credit Notes | `/credit-notes` | CRUD (partially implemented) |
| Chat | `/chat` | Conversations, messages, participants, read receipts |
| Audit | `/audit` | Query by entity/action/user (admin only) |

Full interactive docs at `/api-docs` (Swagger UI).

## Project Structure

```
Finan/
├── src/                        # Backend source
│   ├── server.js               # Entry point (Express + Socket.IO)
│   ├── config/                 # All configuration (centralized)
│   ├── database/               # Models, migrations, seeds, rollback
│   ├── middleware/              # Auth, permissions, error handling, rate limiting, request ID
│   ├── modules/                # Feature modules (controller + service + routes each)
│   │   ├── auth, users, customers, invoices, quotes, receipts
│   │   ├── items, creditNotes, chat, audit
│   ├── socket/                 # Socket.IO setup, handlers, auth
│   ├── routes/                 # API v1 route registration
│   ├── utils/                  # Logger, API responses, permissions, auto-numbering
│   └── validators/             # express-validator schemas
├── frontend/                   # React SPA
│   ├── src/                    # Components, pages, contexts, services
│   ├── Dockerfile              # Nginx production build
│   └── nginx.conf              # SPA routing config
├── tests/                      # Backend tests (333 passing, 45% coverage)
│   ├── __tests__/              # Test files by module
│   ├── factories/              # Data factories
│   └── helpers/                # Test DB utils, auth helpers
├── docs/                       # Documentation
│   ├── TECHNICAL_REFERENCE.md  # Full technical guide
│   ├── PROJECT_ROADMAP.md      # Status & what's next
│   ├── ARCHITECTURE.md         # System design
│   └── archive/                # Historical docs
├── .github/workflows/          # CI/CD pipelines
├── docker-compose.yml          # Dev + production services
├── Dockerfile                  # Multi-stage (deps → dev → production)
└── secrets/                    # Docker secrets for production
```

## Roles & Permissions

| Role | Access |
|------|--------|
| **Admin** | Full access — manage users, view audit logs, all CRUD |
| **Manager** | Business operations — customers, invoices, quotes, receipts, items, chat |
| **User** | Basic operations — view/create own records, participate in chat |

Granular permissions via middleware: `requirePermission()`, `requireRole()`, `requireAdmin`, `requireManagerOrAdmin`.

## Testing

```bash
npm run test:setup-db    # Create test database (one-time)
npm test -- --coverage   # Run all 333 tests with coverage
```

Coverage: 45.55% statement coverage across controllers, services, middleware, and utilities.

## Security

- JWT authentication with configurable expiry
- bcrypt password hashing
- Helmet security headers
- CORS with origin whitelist
- Rate limiting (configurable window/max)
- Input validation on all endpoints (express-validator)
- Audit logging with IP/user agent tracking
- Request ID correlation (X-Request-ID)
- Graceful shutdown handling (SIGTERM/SIGINT)
- Docker secrets for production credentials
- Non-root container user in production

## Documentation

| Document | Description |
|----------|-------------|
| [docs/TECHNICAL_REFERENCE.md](docs/TECHNICAL_REFERENCE.md) | Full technical guide — how to develop, run, test, deploy |
| [docs/PROJECT_ROADMAP.md](docs/PROJECT_ROADMAP.md) | Project status, priorities, and roadmap |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture and design patterns |

## License

ISC
