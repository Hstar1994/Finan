const { AuditLog } = require('../database/models');

/**
 * Sanitize sensitive data from audit logs
 * Redacts passwords, tokens, and other sensitive fields
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  const sensitiveFields = [
    'password',
    'newPassword',
    'currentPassword',
    'confirmPassword',
    'token',
    'refreshToken',
    'apiKey',
    'secret',
    'creditCard',
    'cvv',
    'ssn'
  ];

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });

  return sanitized;
};

const auditLogger = (action, entity) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only log successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const logData = {
          userId: req.user?.id || null,
          action,
          entity,
          entityId: data?.id || req.params?.id || null,
          changes: {
            method: req.method,
            path: req.path,
            body: sanitizeData(req.body),
            params: sanitizeData(req.params),
            query: sanitizeData(req.query)
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        };
        
        // Log asynchronously without blocking the response
        AuditLog.create(logData).catch(err => {
          console.error('Failed to create audit log:', err);
        });
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = auditLogger;
