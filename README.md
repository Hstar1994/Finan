# Finan - Financial Management System

A full-stack financial management application built with Node.js, Express, PostgreSQL, React, and Socket.IO. Manage customers, invoices, quotes, receipts, items, and real-time chat with role-based access control.

## Quick Start

`
docker-compose up -d
docker exec finan-backend npm run db:migrate
docker exec finan-backend npm run db:seed
`

Open http://localhost:8080

| Email | Password | Role |
|-------|----------|------|
| admin@finan.com | admin123 | Admin |
| manager@finan.com | manager123 | Manager |
| user@finan.com | user123 | User |

## Features

- **Customers** — CRUD, balance tracking, credit limits, search/filter
- **Invoices** — Full lifecycle, auto-numbering (INV-XXXXXX), line items, tax/discount
- **Quotes** — Auto-numbering (QUO-XXXXXX), expiry dates, status transitions
- **Receipts** — Auto-numbering (REC-XXXXXX), multiple payment methods, balance updates
- **Items Catalog** — SKU, categories, tax rates, stock tracking
- **Real-Time Chat** — Socket.IO messaging, 3-panel UI, conversation management
- **Audit System** — Full audit trail on all CRUD with IP/user agent tracking
- **Authentication** — JWT with role-based access (Admin, Manager, User)
- **API Documentation** — Swagger/OpenAPI at /api-docs

## Documentation

All docs live in [docs/](docs/):

| Doc | What it covers |
|-----|----------------|
| [docs/README.md](docs/README.md) | Project overview, status, index |
| [docs/SETUP.md](docs/SETUP.md) | How to run, build, deploy, environment variables |
| [docs/PLAN.md](docs/PLAN.md) | Restart plan, priorities, decisions |

Historical docs preserved in [docs/archive/](docs/archive/).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18, Express 4.18 |
| Database | PostgreSQL 15, Sequelize 6.35 |
| Frontend | React 18, Vite 5, React Router 6 |
| Real-Time | Socket.IO 4.8 |
| Auth | JWT, bcryptjs |
| Logging | Winston |
| Container | Docker, docker-compose |
| CI/CD | GitHub Actions |

## License

ISC
