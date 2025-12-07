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
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server - API v1'
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
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/modules/*/routes.js']
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };
