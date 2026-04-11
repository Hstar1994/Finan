const crypto = require('crypto');

/**
 * Request ID Middleware
 * 
 * Generates a unique correlation ID for each request to enable
 * distributed tracing and log correlation across services.
 * 
 * The request ID is:
 * 1. Read from incoming X-Request-ID header (if present)
 * 2. Generated as a new UUID if not provided
 * 3. Added to the response headers
 * 4. Attached to req object for use in logging
 */

const REQUEST_ID_HEADER = 'X-Request-ID';

/**
 * Generate a unique request ID
 * Uses crypto.randomUUID() for RFC 4122 compliant UUIDs
 * @returns {string} UUID v4 string
 */
const generateRequestId = () => {
  return crypto.randomUUID();
};

/**
 * Request ID middleware
 * Adds correlation ID to requests for distributed tracing
 */
const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID or generate a new one
  const requestId = req.get(REQUEST_ID_HEADER) || generateRequestId();
  
  // Attach to request for use in handlers and logging
  req.requestId = requestId;
  
  // Add to response headers for client correlation
  res.setHeader(REQUEST_ID_HEADER, requestId);
  
  // Add timing start for request duration tracking
  req.startTime = Date.now();
  
  next();
};

/**
 * Get request context for logging
 * Helper function to extract common logging context from request
 * @param {Request} req Express request object
 * @returns {Object} Logging context object
 */
const getRequestContext = (req) => {
  return {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    duration: req.startTime ? Date.now() - req.startTime : undefined
  };
};

module.exports = {
  requestIdMiddleware,
  generateRequestId,
  getRequestContext,
  REQUEST_ID_HEADER
};
