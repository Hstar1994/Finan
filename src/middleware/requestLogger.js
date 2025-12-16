const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// Custom token for request body (excluding sensitive data)
morgan.token('body', (req) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return '-';
  }
  
  // Clone body and remove sensitive fields
  const sanitizedBody = { ...req.body };
  const sensitiveFields = ['password', 'newPassword', 'currentPassword', 'token'];
  
  sensitiveFields.forEach(field => {
    if (sanitizedBody[field]) {
      sanitizedBody[field] = '[REDACTED]';
    }
  });
  
  return JSON.stringify(sanitizedBody);
});

// Development format - detailed logging
const devFormat = ':method :url :status :response-time ms - :user-id - :body';

// Production format - structured JSON logging
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time ms',
  userId: ':user-id',
  remoteAddr: ':remote-addr',
  userAgent: ':user-agent',
});

// Create morgan middleware based on environment
const requestLogger = process.env.NODE_ENV === 'production'
  ? morgan(prodFormat, {
      stream: logger.stream,
      skip: (req, res) => res.statusCode < 400, // Only log errors in production
    })
  : morgan(devFormat, {
      stream: logger.stream,
    });

module.exports = requestLogger;
