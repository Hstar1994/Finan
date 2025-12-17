const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for login attempts
 * Limits: 5 requests per 15 minutes per IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false, // Count failed requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts from this IP, please try again after 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Strict rate limiter for sensitive operations
 * Limits: 3 requests per 15 minutes per IP
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    error: 'Too many attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many attempts, please try again after 15 minutes',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Chat rate limiter - per conversation per actor
 * Limits: 60 messages per minute per conversation per actor
 */
const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute per conversation
  keyGenerator: (req) => {
    const actorId = req.userId || req.customerId;
    const conversationId = req.params.id;
    return `chat:conv:${conversationId}:actor:${actorId}`;
  },
  message: {
    error: 'Too many messages to this conversation, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many messages to this conversation, please slow down',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Global chat rate limiter - per actor across all conversations
 * Limits: 100 messages per minute globally per actor
 */
const globalChatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 messages per minute globally
  keyGenerator: (req) => {
    const actorId = req.userId || req.customerId;
    return `chat:global:actor:${actorId}`;
  },
  message: {
    error: 'Too many messages sent, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many messages sent, please slow down',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

module.exports = {
  loginLimiter,
  apiLimiter,
  strictLimiter,
  chatRateLimiter,
  globalChatRateLimiter
};
