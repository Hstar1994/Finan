const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finan API',
      version: '1.0.0',
      description: 'Modular Financing Application API - Similar to Refrens\n\n' +
                   '⚠️ **API Versioning**: All endpoints are now versioned under `/api/v1/`.\n' +
                   'Unversioned access is deprecated and will be removed in future releases.\n\n' +
                   '**Example**: Use `/api/v1/customers` instead of `/api/customers`',
      contact: {
        name: 'API Support',
        email: 'support@finan.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server - API v1'
      },
      {
        url: 'https://api.finan.com/api/v1',
        description: 'Production server - API v1'
      },
      {
        url: 'http://localhost:3000/api',
        description: 'Development server - Unversioned (DEPRECATED)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token obtained from /auth/login endpoint'
        }
      },
      schemas: {
        // Standard Response Schemas
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation successful'
            },
            data: {
              type: 'object'
            },
            meta: {
              type: 'object'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-14T10:30:00.000Z'
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string'
                  },
                  message: {
                    type: 'string'
                  }
                }
              }
            },
            statusCode: {
              type: 'integer',
              example: 400
            },
            timestamp: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 10
            },
            total: {
              type: 'integer',
              example: 100
            },
            totalPages: {
              type: 'integer',
              example: 10
            },
            hasNext: {
              type: 'boolean',
              example: true
            },
            hasPrev: {
              type: 'boolean',
              example: false
            }
          }
        },
        // Entity Schemas
        Customer: {
          type: 'object',
          required: ['name'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            phone: {
              type: 'string',
              example: '+1234567890'
            },
            address: {
              type: 'string',
              example: '123 Main St, City, Country'
            },
            taxId: {
              type: 'string',
              example: 'TAX123456'
            },
            balance: {
              type: 'number',
              format: 'decimal',
              example: 1500.00
            },
            creditLimit: {
              type: 'number',
              format: 'decimal',
              example: 10000.00
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Invoice: {
          type: 'object',
          required: ['customerId', 'dueDate', 'items'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            invoiceNumber: {
              type: 'string',
              example: 'INV-000001'
            },
            customerId: {
              type: 'string',
              format: 'uuid'
            },
            dueDate: {
              type: 'string',
              format: 'date',
              example: '2025-12-31'
            },
            subtotal: {
              type: 'number',
              format: 'decimal'
            },
            taxAmount: {
              type: 'number',
              format: 'decimal'
            },
            discountAmount: {
              type: 'number',
              format: 'decimal'
            },
            totalAmount: {
              type: 'number',
              format: 'decimal'
            },
            status: {
              type: 'string',
              enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
              example: 'sent'
            },
            notes: {
              type: 'string'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        InvoiceItem: {
          type: 'object',
          required: ['itemId', 'quantity', 'unitPrice'],
          properties: {
            itemId: {
              type: 'string',
              format: 'uuid'
            },
            quantity: {
              type: 'number',
              minimum: 1
            },
            unitPrice: {
              type: 'number',
              format: 'decimal'
            },
            taxRate: {
              type: 'number',
              format: 'decimal'
            },
            discount: {
              type: 'number',
              format: 'decimal'
            }
          }
        },
        User: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Jane Smith'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'jane@example.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'staff'],
              example: 'manager'
            },
            isActive: {
              type: 'boolean',
              example: true
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Item: {
          type: 'object',
          required: ['name', 'sku', 'unitPrice'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            name: {
              type: 'string',
              example: 'Product Name'
            },
            description: {
              type: 'string'
            },
            sku: {
              type: 'string',
              example: 'SKU-001'
            },
            unitPrice: {
              type: 'number',
              format: 'decimal',
              example: 99.99
            },
            unit: {
              type: 'string',
              example: 'unit'
            },
            taxRate: {
              type: 'number',
              format: 'decimal'
            },
            isActive: {
              type: 'boolean'
            }
          }
        },
        Receipt: {
          type: 'object',
          required: ['customerId', 'amount', 'paymentMethod', 'paymentDate'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            receiptNumber: {
              type: 'string',
              example: 'REC-000001'
            },
            customerId: {
              type: 'string',
              format: 'uuid'
            },
            invoiceId: {
              type: 'string',
              format: 'uuid',
              nullable: true
            },
            amount: {
              type: 'number',
              format: 'decimal'
            },
            paymentMethod: {
              type: 'string',
              enum: ['cash', 'check', 'bank_transfer', 'credit_card', 'other']
            },
            paymentDate: {
              type: 'string',
              format: 'date'
            },
            reference: {
              type: 'string'
            },
            notes: {
              type: 'string'
            }
          }
        }
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          },
          description: 'Page number'
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          },
          description: 'Items per page'
        },
        SearchParam: {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string'
          },
          description: 'Search term'
        },
        IdParam: {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid'
          },
          description: 'Resource ID'
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Invalid or missing authentication token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError'
              },
              example: {
                success: false,
                message: 'Authentication token required',
                statusCode: 401,
                timestamp: '2025-12-14T10:30:00.000Z'
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError'
              }
            }
          }
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ApiError'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication and authorization endpoints'
      },
      {
        name: 'Customers',
        description: 'Customer management operations'
      },
      {
        name: 'Invoices',
        description: 'Invoice management operations'
      },
      {
        name: 'Items',
        description: 'Product/Service management operations'
      },
      {
        name: 'Receipts',
        description: 'Receipt/Payment management operations'
      },
      {
        name: 'Quotes',
        description: 'Quote management operations'
      },
      {
        name: 'Users',
        description: 'User management operations (admin only)'
      },
      {
        name: 'Audit',
        description: 'Audit log access'
      }
    ]
  },
  apis: ['./src/modules/*/routes.js', './src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };
