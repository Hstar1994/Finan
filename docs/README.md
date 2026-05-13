# Finan

A full-stack financial management application — customers, invoices, quotes, receipts, items catalog, real-time chat, audit logging, and role-based access control.

**Stack:** Node.js / Express / PostgreSQL / Sequelize / React 18 / Vite / Socket.IO / Docker

## Status

| Area | Status |
|------|--------|
| Backend API (10 modules) | Complete |
| Frontend SPA (10 pages) | Complete |
| Auth & RBAC (Admin/Manager/User) | Complete |
| Docker deployment | Complete |
| CI/CD (GitHub Actions) | Complete |
| Credit Notes module | Partial (backend done, no frontend) |
| Reports & Analytics | Not started |

## Quick Start

`
docker-compose up -d
docker exec finan-backend npm run db:migrate
docker exec finan-backend npm run db:seed
`

Open http://localhost:8080 — login with \dmin@finan.com\ / \dmin123\

## Docs

| Document | Purpose |
|----------|---------|
| [SETUP.md](SETUP.md) | How to run, build, deploy |
| [PLAN.md](PLAN.md) | Restart plan, priorities, decisions |
| [archive/](archive/) | Historical documentation (preserved) |
