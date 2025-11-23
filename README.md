# Finan - Modular Financing Application

A comprehensive, modular financing application similar to Refrens, built with Node.js, Express, and PostgreSQL.

## Features

### 🔐 Secure Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin, Manager, User)
- Secure password hashing with bcrypt
- Token-based session management

### 💾 Docker-Backed Database
- PostgreSQL database with Docker support
- Persistent data volumes
- Easy setup and deployment

### 👥 Customer Management
- Complete customer profiles
- Balance tracking
- Credit limit management
- Customer search and filtering

### 📄 Financial Documents
- **Invoices**: Create, manage, and track invoices with automatic numbering
- **Quotes**: Generate professional quotes with expiry dates
- **Receipts**: Record payments with multiple payment methods
- **Credit Notes**: Issue credit notes for returns and adjustments

### 🏷️ Item Price List
- Comprehensive item/product catalog
- SKU management
- Category organization
- Tax rate configuration
- Unit price tracking

### 📊 Audit Logging
- Complete audit trail for all changes
- Track user actions with timestamps
- IP address and user agent logging
- Query audit logs by entity, action, or user

### 🎯 Clean API Structure
- RESTful API design
- Modular architecture
- Swagger/OpenAPI documentation
- Error handling and validation
- Rate limiting for security

### 🔮 Future-Ready
- Modular design for easy extension
- Ready for CRM integration
- Payment gateway integration support
- Reporting module support

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, bcryptjs, CORS, Rate limiting
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker, Docker Compose

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or yarn

## Quick Start (5 minutes)

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/Hstar1994/Finan.git
cd Finan

# 2. Start everything with Docker
docker-compose up -d

# 3. Run migrations and seed data
docker-compose exec backend npm run db:migrate
docker-compose exec backend npm run db:seed

# 4. Open your browser
# Backend API: http://localhost:3000
# Frontend: http://localhost:8080
# API Docs: http://localhost:3000/api-docs
```

**Default Login Credentials:**
- Admin: `admin@finan.com` / `admin123`
- Manager: `manager@finan.com` / `manager123`
- User: `user@finan.com` / `user123`

### Option 2: Local Development

```bash
# 1. Clone and install
git clone https://github.com/Hstar1994/Finan.git
cd Finan
npm install

# 2. Start PostgreSQL with Docker
docker-compose up -d postgres

# 3. Setup environment
cp .env.example .env
# Edit .env if needed

# 4. Setup database
npm run db:migrate
npm run db:seed

# 5. Start backend
npm run dev

# 6. Start frontend (in another terminal)
cd frontend
npm start
```

## Detailed Installation

### Prerequisites
- Docker Desktop (for containerized setup)
- OR Node.js v14+ and PostgreSQL (for local setup)

### Environment Configuration

The `.env` file is created automatically, but you can customize:

```env
NODE_ENV=development
PORT=3000

# Database (use 'postgres' as host when running in Docker)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=finan_db
DB_USER=finan
DB_PASSWORD=finan123

# JWT (change in production!)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Available Scripts

```bash
# Backend
npm start              # Start production server
npm run dev           # Start development server with auto-reload
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed demo data

# Docker
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose logs -f backend    # View backend logs
docker-compose logs -f postgres   # View database logs
docker-compose exec backend bash  # Access backend container shell
```

## Accessing the Application

Once running, you can access:

- **Frontend**: http://localhost:8080 (Login and dashboard)
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-docs
- **Health Check**: http://localhost:3000/api/health

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:3000/api-docs

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Customers
- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create new customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `PATCH /api/customers/:id/balance` - Update customer balance

### Items
- `GET /api/items` - List all items
- `GET /api/items/:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Quotes
- `GET /api/quotes` - List all quotes
- `GET /api/quotes/:id` - Get quote by ID
- `POST /api/quotes` - Create new quote
- `PUT /api/quotes/:id` - Update quote
- `DELETE /api/quotes/:id` - Delete quote

### Receipts
- `GET /api/receipts` - List all receipts
- `GET /api/receipts/:id` - Get receipt by ID
- `POST /api/receipts` - Create new receipt
- `PUT /api/receipts/:id` - Update receipt
- `DELETE /api/receipts/:id` - Delete receipt

### Credit Notes
- `GET /api/credit-notes` - List all credit notes
- `GET /api/credit-notes/:id` - Get credit note by ID
- `POST /api/credit-notes` - Create new credit note
- `PUT /api/credit-notes/:id` - Update credit note
- `DELETE /api/credit-notes/:id` - Delete credit note

### Audit Logs
- `GET /api/audit` - List all audit logs
- `GET /api/audit/:id` - Get audit log by ID
- `GET /api/audit/:entity/:entityId` - Get audit logs for specific entity

## Project Structure

```
Finan/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Main config
│   │   └── swagger.js    # API documentation config
│   ├── database/         # Database layer
│   │   ├── models/       # Sequelize models
│   │   ├── connection.js # Database connection
│   │   ├── migrate.js    # Migration script
│   │   └── seed.js       # Seed script
│   ├── middleware/       # Express middleware
│   │   ├── auth.js       # Authentication & authorization
│   │   ├── auditLogger.js # Audit logging
│   │   └── errorHandler.js # Error handling
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication module
│   │   ├── customers/    # Customer management
│   │   ├── items/        # Item/product management
│   │   ├── invoices/     # Invoice management
│   │   ├── quotes/       # Quote management
│   │   ├── receipts/     # Receipt management
│   │   ├── creditNotes/  # Credit note management
│   │   └── audit/        # Audit log viewing
│   ├── routes/           # Route definitions
│   │   └── index.js      # Main router
│   └── server.js         # Application entry point
├── docker-compose.yml    # Docker configuration
├── package.json          # Dependencies
├── .env.example          # Environment template
└── README.md            # Documentation
```

## Role-Based Access Control

### Admin
- Full access to all features
- Can create/update/delete all entities
- Can manage users
- Can view audit logs

### Manager
- Can create/update customers, items, invoices, quotes, receipts, credit notes
- Cannot delete major entities
- Can view audit logs
- Cannot manage users

### User
- Read-only access to most entities
- Cannot create/update/delete
- Limited access to audit logs

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Cross-origin resource sharing protection
- **Helmet**: Security headers
- **Input Validation**: Request validation and sanitization
- **Audit Logging**: Complete activity tracking

## Database Schema

The application uses a relational database with the following main entities:

- **Users**: System users with roles
- **Customers**: Customer profiles with balances
- **Items**: Product/service catalog
- **Invoices**: Sales invoices with line items
- **Quotes**: Sales quotes with line items
- **Receipts**: Payment receipts
- **CreditNotes**: Credit notes with line items
- **AuditLogs**: Complete audit trail

## Development

### Running in development mode

```bash
npm run dev
```

This uses nodemon for automatic restart on file changes.

### Database operations

```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## Docker Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View logs
docker-compose logs -f

# Remove volumes (destroys data)
docker-compose down -v
```

## Future Enhancements

The modular architecture supports easy addition of:

- 📊 **Reporting Module**: Sales reports, customer reports, financial dashboards
- 💳 **Payment Gateway Integration**: Stripe, PayPal, Razorpay
- 📧 **Email Notifications**: Invoice sending, payment reminders
- 📱 **CRM Features**: Lead management, opportunity tracking
- 🔔 **Notifications**: Real-time alerts and notifications
- 📅 **Scheduling**: Recurring invoices, payment reminders
- 📤 **Export Features**: PDF generation, Excel exports
- 🌍 **Multi-currency**: Support for multiple currencies
- 🎨 **Customization**: Custom fields, templates

## License

ISC

## Support

For issues and questions, please open an issue on GitHub.
