const { AuditLog } = require('../database/models');

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
            body: req.body,
            params: req.params,
            query: req.query
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
