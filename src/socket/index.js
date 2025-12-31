const { Server } = require('socket.io');
const { authenticateSocket } = require('./middleware/auth');
const { handleChatConnection } = require('./handlers/chat.handlers');
const logger = require('../utils/logger');
const config = require('../config');

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
const initializeSocketIO = (httpServer) => {
  // Create Socket.IO server with CORS configuration
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontend.url,
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Connection options
    pingTimeout: 60000,
    pingInterval: 25000,
    // Allow both WebSocket and polling
    transports: ['websocket', 'polling']
  });

  // Apply authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', (socket) => {
    const actorType = socket.actorType;
    const actorId = socket.userId || socket.customerId;
    
    logger.info(`Socket.IO connection: ${actorType} ${actorId} (${socket.id})`);

    // Handle chat-related events
    handleChatConnection(io, socket);

    // Handle general disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Socket.IO disconnected: ${actorType} ${actorId} - ${reason}`);
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(`Socket.IO error for ${actorType} ${actorId}:`, error);
    });
  });

  // Handle server-level errors
  io.engine.on('connection_error', (error) => {
    logger.error('Socket.IO connection error:', {
      message: error.message,
      code: error.code,
      context: error.context
    });
  });

  logger.info('Socket.IO server initialized successfully');

  return io;
};

module.exports = { initializeSocketIO };
