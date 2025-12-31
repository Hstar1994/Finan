const express = require('express');
const http = require('http');
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
const { initializeSocketIO } = require('./socket');

const app = express();
const httpServer = http.createServer(app);

// Security middleware
app.use(helmet());

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

// Health check endpoint for monitoring and load balancers
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await testConnection();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: config.app.env,
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
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
    const io = initializeSocketIO(httpServer);
    
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

startServer();

module.exports = app;
