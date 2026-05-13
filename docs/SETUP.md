# Setup

## Prerequisites

- Docker & docker-compose (recommended)
- Node.js 18+ (for local dev without Docker)
- PostgreSQL 15 (Docker container or local)

---

## Quick Start (Docker)

`
# Start all services
docker-compose up -d

# Run migrations
docker exec finan-backend npm run db:migrate

# Seed demo data
docker exec finan-backend npm run db:seed
`

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| API | http://localhost:3000/api/v1 |
| Swagger Docs | http://localhost:3000/api-docs |
| Health Check | http://localhost:3000/api/health |

### Default Logins

| Email | Password | Role |
|-------|----------|------|
| admin@finan.com | admin123 | Admin |
| manager@finan.com | manager123 | Manager |
| user@finan.com | user123 | User |

---

## Local Development (No Docker)

`
# Backend
npm install
docker-compose up -d postgres
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
`

---

## Environment Variables

### Backend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| NODE_ENV | development | development / production / test |
| PORT | 3000 | Server port |
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | finan_db | Database name |
| DB_USER | finan | Database user |
| DB_PASSWORD | finan123 | Database password |
| JWT_SECRET | — | JWT signing key (change in production) |
| JWT_EXPIRES_IN | 24h | Token expiry |
| CORS_ORIGIN | localhost variants | Comma-separated allowed origins |
| LOG_LEVEL | info | Winston log level |

### Frontend (frontend/.env)

| Variable | Default | Description |
|----------|---------|-------------|
| VITE_API_URL | http://localhost:3000/api | Backend API URL |
| VITE_APP_NAME | Finan | App title |
| VITE_APP_VERSION | 1.0.0 | Displayed version |

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| npm start | Production server |
| npm run dev | Dev with hot-reload (nodemon) |
| npm run db:migrate | Apply migrations |
| npm run db:rollback | Rollback last migration |
| npm run db:seed | Seed demo data |
| npm run db:status | Migration status |
| npm run db:indexes | Add performance indexes |

### Docker

`
docker-compose up -d                     # Start all services
docker-compose up -d --build             # Rebuild and start
docker-compose logs -f backend           # View backend logs
docker-compose down                      # Stop all
docker-compose down -v                   # Stop and delete DB data
docker-compose --profile production up -d backend-prod  # Production mode
`

---

## Project Structure

`
Finan/
├── src/                    # Backend
│   ├── server.js           # Entry point
│   ├── config/             # Centralized configuration
│   ├── database/           # Models, migrations, seeds
│   ├── middleware/          # Auth, permissions, error handling, rate limiting
│   ├── modules/            # Feature modules (controller + routes)
│   │   ├── auth/           # Authentication
│   │   ├── users/          # User management
│   │   ├── customers/      # Customer CRUD
│   │   ├── invoices/       # Invoice lifecycle
│   │   ├── quotes/         # Quotes with line items
│   │   ├── receipts/       # Payment receipts
│   │   ├── items/          # Product catalog
│   │   ├── creditNotes/    # Credit notes
│   │   ├── chat/           # Real-time chat
│   │   └── audit/          # Audit trail
│   ├── socket/             # Socket.IO setup + handlers
│   ├── routes/             # Route registration
│   ├── utils/              # Logger, permissions, numbering
│   └── validators/         # Express-validator schemas
├── frontend/               # React SPA
├── docs/                   # Documentation
├── tests/                  # Test files
├── docker-compose.yml
└── Dockerfile
`

---

## API Endpoints

All endpoints under /api/v1. Authentication via Authorization: Bearer <token>.

| Module | Prefix | Operations |
|--------|--------|------------|
| Auth | /auth | login, register, refresh-token, change-password |
| Users | /users | CRUD, stats (admin only) |
| Customers | /customers | CRUD, search, balance |
| Invoices | /invoices | CRUD, status, line items |
| Quotes | /quotes | CRUD, status, line items |
| Receipts | /receipts | CRUD, payment methods |
| Items | /items | CRUD, SKU, categories |
| Credit Notes | /credit-notes | CRUD (partial) |
| Chat | /chat | Conversations, messages |
| Audit | /audit | Query logs (admin) |

Interactive API docs at /api-docs (Swagger UI).
