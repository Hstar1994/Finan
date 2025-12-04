const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { testConnection } = require('./database/connection');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerUi } = require('./config/swagger');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging middleware (before routes)
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Finan API',
    version: '1.0.0',
    documentation: '/api-docs'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }
    
    // Start listening
    app.listen(config.app.port, () => {
      const startupMessage = `
╔═══════════════════════════════════════════════════════╗
║                    Finan API Server                   ║
╟───────────────────────────────────────────────────────╢
║  Environment: ${config.app.env.padEnd(39)}║
║  Port:        ${String(config.app.port).padEnd(39)}║
║  API Docs:    http://localhost:${config.app.port}/api-docs${' '.repeat(9)}║
╚═══════════════════════════════════════════════════════╝
      `;
      console.log(startupMessage);
      logger.info('Server started successfully', {
        environment: config.app.env,
        port: config.app.port,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

startServer();

module.exports = app;
