const express = require('express');
const router = express.Router();
const config = require('../config');

// Import versioned routes
const v1Routes = require('./v1');

// Health check endpoint (unversioned)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: config.app.version || '1.0.0',
    environment: config.app.env,
    timestamp: new Date().toISOString()
  });
});

// API v1 routes
router.use('/v1', v1Routes);

// Default to v1 (for backward compatibility - will be deprecated)
// Log warning for unversioned API access
router.use('/', (req, res, next) => {
  if (!req.path.startsWith('/health')) {
    console.warn('⚠️ DEPRECATED: Unversioned API access. Please use /api/v1/ instead');
  }
  next();
}, v1Routes);

module.exports = router;
