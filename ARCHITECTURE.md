# Finan Application Architecture

## Overview

Finan is a modular financing application built with a clean, scalable architecture that follows industry best practices. This document outlines the system architecture, design patterns, and key technical decisions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                        │
│  (Web Browser, Mobile App, Third-party integrations)       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                      │
│  • Rate Limiting                                            │
│  • CORS                                                     │
│  • Security Headers (Helmet)                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
│  • JWT Token Validation                                     │
│  • Role-Based Access Control                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌───────────┬───────────┬───────────┬───────────┐          │
│  │   Auth    │ Customers │  Invoices │  Quotes   │          │
│  │  Module   │  Module   │  Module   │  Module   │          │
│  └───────────┴───────────┴───────────┴───────────┘          │
│  ┌───────────┬───────────┬───────────┬───────────┐          │
│  │ Receipts  │  Credit   │   Items   │   Audit   │          │
│  │  Module   │   Notes   │  Module   │  Module   │          │
│  └───────────┴───────────┴───────────┴───────────┘          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Middleware Layer                       │
│  • Audit Logging                                            │
│  • Error Handling                                           │
│  • Request Validation                                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                      │
│  • Sequelize ORM                                            │
│  • Model Definitions                                        │
│  • Relationships                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                         │
│  • PostgreSQL 15                                            │
│  • Docker Container                                         │
│  • Persistent Volume Storage                                │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
Finan/
├── src/
│   ├── config/                  # Configuration management
│   │   ├── index.js             # Main configuration
│   │   └── swagger.js           # API documentation config
│   │
│   ├── database/                # Database layer
│   │   ├── models/              # Sequelize models
│   │   │   ├── User.js          # User model with auth
│   │   │   ├── Customer.js      # Customer model
│   │   │   ├── Item.js          # Product/Service items
│   │   │   ├── Invoice.js       # Invoice header
│   │   │   ├── InvoiceItem.js   # Invoice line items
│   │   │   ├── Quote.js         # Quote header
│   │   │   ├── QuoteItem.js     # Quote line items
│   │   │   ├── Receipt.js       # Payment receipts
│   │   │   ├── CreditNote.js    # Credit note header
│   │   │   ├── CreditNoteItem.js # Credit note line items
│   │   │   ├── AuditLog.js      # Audit trail
│   │   │   └── index.js         # Model relationships
│   │   ├── connection.js        # Database connection
│   │   ├── migrate.js           # Migration script
│   │   └── seed.js              # Seeding script
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.js              # Authentication & authorization
│   │   ├── auditLogger.js       # Audit logging middleware
│   │   └── errorHandler.js      # Global error handler
│   │
│   ├── modules/                 # Feature modules
│   │   ├── auth/                # Authentication module
│   │   │   ├── controller.js    # Business logic
│   │   │   └── routes.js        # Route definitions
│   │   ├── customers/           # Customer management
│   │   ├── items/               # Item management
│   │   ├── invoices/            # Invoice management
│   │   ├── quotes/              # Quote management
│   │   ├── receipts/            # Receipt management
│   │   ├── creditNotes/         # Credit note management
│   │   └── audit/               # Audit log viewing
│   │
│   ├── routes/                  # Route aggregation
│   │   └── index.js             # Main router
│   │
│   └── server.js                # Application entry point
│
├── docker-compose.yml           # Docker configuration
├── package.json                 # Dependencies
├── .env.example                 # Environment template
└── README.md                    # Documentation
```

## Design Patterns

### 1. Module Pattern
Each feature is organized as a self-contained module with:
- **Controller**: Business logic and data processing
- **Routes**: Endpoint definitions and middleware
- Clear separation of concerns

### 2. Repository Pattern
Data access is abstracted through Sequelize ORM:
- Models define data structure and relationships
- Controllers interact with models, not raw SQL
- Easy to swap data sources if needed

### 3. Middleware Pattern
Cross-cutting concerns are handled via middleware:
- Authentication/Authorization
- Audit logging
- Error handling
- Request validation

### 4. Factory Pattern
Automatic generation of unique identifiers:
- Invoice numbers (INV-000001)
- Quote numbers (QUO-000001)
- Receipt numbers (REC-000001)
- Credit note numbers (CN-000001)

## Key Features

### 1. Authentication & Authorization

**JWT-Based Authentication**:
- Stateless authentication using JSON Web Tokens
- Token includes user ID, email, and role
- Configurable expiration time

**Role-Based Access Control**:
- **Admin**: Full access to all resources
- **Manager**: Can create/update but limited delete permissions
- **User**: Read-only access to most resources

### 2. Audit Logging

Every significant operation is logged:
- User who performed the action
- Action type (CREATE, UPDATE, DELETE)
- Entity affected
- Complete change details
- IP address and user agent
- Timestamp

### 3. Data Validation

Multiple layers of validation:
- Model-level constraints (Sequelize)
- Business logic validation in controllers
- Request validation middleware

### 4. Security Features

**Application Security**:
- Helmet.js for security headers
- CORS configuration
- Rate limiting to prevent abuse
- Password hashing with bcrypt
- SQL injection prevention via ORM

**Database Security**:
- Connection pooling
- Parameterized queries
- Transaction support

## Database Schema

### Entity Relationships

```
Users
  └── (created) Invoices, Quotes, Receipts, CreditNotes
  └── (logged) AuditLogs

Customers
  ├── Invoices
  ├── Quotes
  ├── Receipts
  └── CreditNotes

Items
  ├── InvoiceItems
  ├── QuoteItems
  └── CreditNoteItems

Invoices
  ├── InvoiceItems (cascade delete)
  ├── Receipts
  └── CreditNotes

Quotes
  └── QuoteItems (cascade delete)

CreditNotes
  └── CreditNoteItems (cascade delete)
```

### Key Design Decisions

1. **UUID Primary Keys**: Better for distributed systems and security
2. **Soft Deletes**: Maintain data integrity (isActive flags)
3. **Decimal Types**: Precise financial calculations
4. **JSONB for Audit**: Flexible storage for change tracking
5. **Timestamps**: Automatic createdAt/updatedAt on all models

## API Design

### RESTful Principles

- **Resources**: Nouns in URLs (e.g., /customers, /invoices)
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: Appropriate HTTP status codes
- **Pagination**: Page and limit parameters
- **Filtering**: Query parameters for filtering

### Response Format

```json
{
  "message": "Success message",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### Error Format

```json
{
  "error": "Error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Scalability Considerations

### Horizontal Scaling
- Stateless design (JWT auth)
- No server-side session storage
- Can run multiple instances behind load balancer

### Database Optimization
- Indexed foreign keys
- Connection pooling
- Query optimization via ORM

### Performance
- Pagination on all list endpoints
- Lazy loading of relationships
- Efficient SQL queries via Sequelize

## Security Best Practices

1. **Never store plain passwords**: Always hashed with bcrypt
2. **JWT secrets**: Should be strong and rotated regularly
3. **Environment variables**: Sensitive data in .env file
4. **HTTPS**: Required in production
5. **Rate limiting**: Prevents brute force attacks
6. **Input validation**: All user input is validated
7. **Audit logging**: Complete trail of all actions

## Future Extensions

The architecture supports easy addition of:

### 1. Payment Integration
```javascript
src/modules/payments/
  ├── controller.js
  ├── routes.js
  └── providers/
      ├── stripe.js
      ├── paypal.js
      └── razorpay.js
```

### 2. Reporting
```javascript
src/modules/reports/
  ├── controller.js
  ├── routes.js
  └── generators/
      ├── salesReport.js
      ├── customerReport.js
      └── taxReport.js
```

### 3. CRM Features
```javascript
src/modules/crm/
  ├── leads/
  ├── opportunities/
  └── activities/
```

### 4. Notifications
```javascript
src/modules/notifications/
  ├── email/
  ├── sms/
  └── push/
```

### 5. File Management
```javascript
src/modules/files/
  ├── upload.js
  ├── storage.js
  └── pdf-generator.js
```

## Development Workflow

1. **Local Development**:
   ```bash
   docker compose up -d
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

2. **Adding a New Module**:
   - Create module directory in `src/modules/`
   - Add controller.js with business logic
   - Add routes.js with endpoint definitions
   - Register routes in `src/routes/index.js`
   - Add Swagger documentation

3. **Database Changes**:
   - Update model files
   - Run `npm run db:migrate` to sync schema
   - Update seed data if needed

## Testing Strategy

### Levels of Testing

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test API endpoints
3. **E2E Tests**: Test complete workflows

### Test Structure (Recommended)
```javascript
test/
  ├── unit/
  │   ├── models/
  │   └── utils/
  ├── integration/
  │   └── api/
  └── e2e/
      └── workflows/
```

## Deployment

### Production Checklist

- [ ] Change JWT_SECRET to strong random value
- [ ] Update database credentials
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Configure logging (Winston to file/service)
- [ ] Set up monitoring
- [ ] Configure rate limits appropriately
- [ ] Review and update security headers

### Docker Deployment

```bash
# Build application
docker build -t finan-app .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## Monitoring & Maintenance

### Key Metrics to Monitor

1. **Application**:
   - Request rate
   - Response time
   - Error rate
   - Memory usage

2. **Database**:
   - Connection pool usage
   - Query performance
   - Storage usage

3. **Business**:
   - Number of invoices created
   - Total transaction value
   - Active users

### Maintenance Tasks

1. **Regular**:
   - Review audit logs
   - Monitor error logs
   - Check database performance

2. **Periodic**:
   - Update dependencies
   - Rotate JWT secrets
   - Archive old audit logs
   - Database optimization

## Conclusion

Finan's architecture prioritizes:
- **Modularity**: Easy to extend and maintain
- **Security**: Multiple layers of protection
- **Scalability**: Ready for growth
- **Developer Experience**: Clear structure and documentation
- **Production Readiness**: Best practices and monitoring

The modular design allows teams to work independently on different features while maintaining a clean, cohesive codebase.
