# API Testing Guide

This document provides examples of how to test all API endpoints.

## Setup

1. Start the database: `docker compose up -d`
2. Run migrations: `npm run db:migrate`
3. Seed default users: `npm run db:seed`
4. Start the server: `npm start`

## Default Users

After seeding, these users are available:
- **Admin**: admin@finan.com / admin123
- **Manager**: manager@finan.com / manager123
- **User**: user@finan.com / user123

## Authentication

### 1. Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@finan.com",
    "password": "admin123"
  }'
```

Save the token from the response for subsequent requests.

### 2. Get Profile
```bash
curl http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Update Profile
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Updated",
    "lastName": "Name"
  }'
```

### 4. Change Password
```bash
curl -X POST http://localhost:3000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "admin123",
    "newPassword": "newpassword123"
  }'
```

## Customer Management

### 1. Create Customer
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "address": "123 Business Street",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "zipCode": "10001",
    "taxId": "12-3456789",
    "creditLimit": 100000
  }'
```

### 2. List Customers
```bash
curl http://localhost:3000/api/customers?page=1&limit=10&search=Acme \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Customer by ID
```bash
curl http://localhost:3000/api/customers/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update Customer
```bash
curl -X PUT http://localhost:3000/api/customers/CUSTOMER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+9876543210",
    "creditLimit": 150000
  }'
```

### 5. Update Customer Balance
```bash
curl -X PATCH http://localhost:3000/api/customers/CUSTOMER_ID/balance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "operation": "add"
  }'
```

## Item Management

### 1. Create Item
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Professional Services",
    "description": "Hourly consulting services",
    "sku": "PROF-001",
    "unitPrice": 200.00,
    "category": "Services",
    "unit": "hour",
    "taxRate": 10.00
  }'
```

### 2. List Items
```bash
curl http://localhost:3000/api/items?page=1&limit=10&category=Services \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Item by ID
```bash
curl http://localhost:3000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update Item
```bash
curl -X PUT http://localhost:3000/api/items/ITEM_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "unitPrice": 225.00
  }'
```

## Invoice Management

### 1. Create Invoice
```bash
curl -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "dueDate": "2025-12-31",
    "items": [
      {
        "itemId": "ITEM_ID",
        "description": "Professional Services",
        "quantity": 20,
        "unitPrice": 200.00,
        "taxRate": 10.00
      },
      {
        "description": "Custom Work",
        "quantity": 5,
        "unitPrice": 300.00,
        "taxRate": 10.00
      }
    ],
    "notes": "Thank you for your business",
    "terms": "Payment due within 30 days"
  }'
```

### 2. List Invoices
```bash
curl http://localhost:3000/api/invoices?page=1&limit=10&status=draft \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Invoice by ID
```bash
curl http://localhost:3000/api/invoices/INVOICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update Invoice
```bash
curl -X PUT http://localhost:3000/api/invoices/INVOICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sent"
  }'
```

## Quote Management

### 1. Create Quote
```bash
curl -X POST http://localhost:3000/api/quotes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "expiryDate": "2025-12-31",
    "items": [
      {
        "itemId": "ITEM_ID",
        "description": "Professional Services",
        "quantity": 10,
        "unitPrice": 200.00,
        "taxRate": 10.00
      }
    ],
    "notes": "Quote valid for 30 days",
    "terms": "50% advance payment required"
  }'
```

### 2. List Quotes
```bash
curl http://localhost:3000/api/quotes?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Quote by ID
```bash
curl http://localhost:3000/api/quotes/QUOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Update Quote Status
```bash
curl -X PUT http://localhost:3000/api/quotes/QUOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "accepted"
  }'
```

## Receipt Management

### 1. Create Receipt
```bash
curl -X POST http://localhost:3000/api/receipts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "invoiceId": "INVOICE_ID",
    "amount": 5000.00,
    "paymentMethod": "bank_transfer",
    "reference": "TXN123456",
    "notes": "Payment received via bank transfer"
  }'
```

### 2. List Receipts
```bash
curl http://localhost:3000/api/receipts?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Receipt by ID
```bash
curl http://localhost:3000/api/receipts/RECEIPT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Credit Note Management

### 1. Create Credit Note
```bash
curl -X POST http://localhost:3000/api/credit-notes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUSTOMER_ID",
    "invoiceId": "INVOICE_ID",
    "items": [
      {
        "description": "Product Return",
        "quantity": 2,
        "unitPrice": 200.00,
        "taxRate": 10.00
      }
    ],
    "reason": "Damaged goods returned",
    "notes": "Credit to be applied to next invoice"
  }'
```

### 2. List Credit Notes
```bash
curl http://localhost:3000/api/credit-notes?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Credit Note by ID
```bash
curl http://localhost:3000/api/credit-notes/CREDIT_NOTE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Audit Logs

### 1. List All Audit Logs
```bash
curl http://localhost:3000/api/audit?page=1&limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Filter Audit Logs
```bash
curl "http://localhost:3000/api/audit?entity=Invoice&action=CREATE&startDate=2025-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get Audit Logs for Specific Entity
```bash
curl http://localhost:3000/api/audit/Invoice/INVOICE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Complete Workflow Example

Here's a complete workflow example:

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@finan.com","password":"admin123"}' | jq -r '.token')

# 2. Create a customer
CUSTOMER_ID=$(curl -s -X POST http://localhost:3000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tech Corp","email":"tech@corp.com","phone":"+1234567890","creditLimit":50000}' | jq -r '.customer.id')

# 3. Create an item
ITEM_ID=$(curl -s -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Consulting","sku":"CONS-001","unitPrice":150,"category":"Services","taxRate":10}' | jq -r '.item.id')

# 4. Create an invoice
INVOICE_ID=$(curl -s -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"dueDate\":\"2025-12-31\",\"items\":[{\"itemId\":\"$ITEM_ID\",\"description\":\"Consulting\",\"quantity\":10,\"unitPrice\":150,\"taxRate\":10}]}" | jq -r '.invoice.id')

# 5. Create a receipt for the invoice
curl -X POST http://localhost:3000/api/receipts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"customerId\":\"$CUSTOMER_ID\",\"invoiceId\":\"$INVOICE_ID\",\"amount\":1650,\"paymentMethod\":\"bank_transfer\"}"

# 6. View audit logs
curl "http://localhost:3000/api/audit?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## API Documentation

For interactive API documentation, visit:
- http://localhost:3000/api-docs

This provides a Swagger UI interface where you can test all endpoints directly from your browser.
