const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { sequelize, testConnection } = require('./database/connection');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const { specs, swaggerUi } = require('./config/swagger');
const requestLogger = require('./middleware/requestLogger');
const { requestIdMiddleware } = require('./middleware/requestId');
const logger = require('./utils/logger');
const { initializeSocketIO } = require('./socket');

const app = express();
const httpServer = http.createServer(app);

// Track server state for graceful shutdown
let isShuttingDown = false;
let io = null;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", 'data:', 'https:']
    }
  }
}));

// Request ID middleware (must be early for correlation)
app.use(requestIdMiddleware);

// Graceful shutdown middleware - reject new requests when shutting down
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    return res.status(503).json({
      success: false,
      message: 'Server is shutting down, please retry later'
    });
  }
  next();
});

// CORS configuration - whitelist specific origins
const corsOptions = {
  origin: (origin, callback) => {
    // Parse allowed origins from config
    const whitelist = config.cors.origin;
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (whitelist.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and auth headers
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Response compression for improved payload performance
app.use(compression());

// Request logging middleware (before routes)
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
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

// Health check endpoint for monitoring and load balancers
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: config.app.env,
    version: '1.0.0',
    checks: {}
  };
  
  try {
    // 1. Database health check
    const dbStart = Date.now();
    await testConnection();
    healthData.checks.database = {
      status: 'healthy',
      responseTime: Date.now() - dbStart
    };
  } catch (error) {
    healthData.status = 'unhealthy';
    healthData.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
  }
  
  // 2. Memory usage
  const memUsage = process.memoryUsage();
  healthData.checks.memory = {
    status: 'healthy',
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
    rss: Math.round(memUsage.rss / 1024 / 1024),
    unit: 'MB'
  };
  
  // Warn if heap usage is above 80%
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 80) {
    healthData.checks.memory.status = 'warning';
    healthData.checks.memory.warning = `Heap usage at ${heapUsagePercent.toFixed(1)}%`;
  }
  
  // 3. Socket.IO status
  if (io) {
    const sockets = await io.fetchSockets();
    healthData.checks.socketIO = {
      status: 'healthy',
      connectedClients: sockets.length
    };
  } else {
    healthData.checks.socketIO = {
      status: 'not_initialized'
    };
  }
  
  // 4. Database pool stats (if available)
  try {
    const pool = sequelize.connectionManager.pool;
    if (pool) {
      healthData.checks.databasePool = {
        status: 'healthy',
        size: pool.size || 0,
        available: pool.available || 0,
        pending: pool.pending || 0
      };
    }
  } catch (e) {
    // Pool stats not available
    healthData.checks.databasePool = { status: 'unknown' };
  }
  
  // Calculate total response time
  healthData.responseTime = Date.now() - startTime;
  
  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// Readiness probe for Kubernetes/Docker orchestration
app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
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
    
    // Initialize Socket.IO
    io = initializeSocketIO(httpServer);
    
    // Make io instance available to routes if needed
    app.set('io', io);
    
    // Start listening
    httpServer.listen(config.app.port, () => {
      const startupMessage = `
╔═══════════════════════════════════════════════════════╗
║                    Finan API Server                   ║
╟───────────────────────────────────────────────────────╢
║  Environment: ${config.app.env.padEnd(39)}║
║  Port:        ${String(config.app.port).padEnd(39)}║
║  API Docs:    http://localhost:${config.app.port}/api-docs${' '.repeat(9)}║
║  Socket.IO:   Enabled${' '.repeat(31)}║
╚═══════════════════════════════════════════════════════╝
      `;
      console.log(startupMessage);
      logger.info('Server started successfully', {
        environment: config.app.env,
        port: config.app.port,
        socketIO: 'enabled'
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }
  
  isShuttingDown = true;
  logger.info('Graceful shutdown initiated', { signal });
  
  // Set a hard timeout for shutdown (30 seconds)
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);
  
  try {
    // 1. Close Socket.IO connections
    if (io) {
      logger.info('Closing Socket.IO connections...');
      await new Promise((resolve) => {
        io.close(() => {
          logger.info('Socket.IO connections closed');
          resolve();
        });
      });
    }
    
    // 2. Close HTTP server (stop accepting new connections)
    logger.info('Closing HTTP server...');
    await new Promise((resolve, reject) => {
      httpServer.close((err) => {
        if (err) {
          logger.error('Error closing HTTP server', { error: err.message });
          reject(err);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });
    
    // 3. Close database connection pool
    logger.info('Closing database connections...');
    await sequelize.close();
    logger.info('Database connections closed');
    
    // Clear the timeout and exit cleanly
    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

startServer();

module.exports = app;
