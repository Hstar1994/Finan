const jwt = require('jsonwebtoken');
const { User, Customer } = require('../../database/models');

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user/customer to socket
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from auth object or handshake query
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Determine actor type (staff vs customer)
    const isCustomer = decoded.type === 'customer';

    if (isCustomer) {
      // Customer authentication
      const customer = await Customer.findByPk(decoded.customerId);
      
      if (!customer) {
        return next(new Error('Customer not found'));
      }

      if (!customer.authEnabled) {
        return next(new Error('Customer authentication disabled'));
      }

      // Attach customer info to socket
      socket.actorType = 'customer';
      socket.customerId = customer.id;
      socket.customer = customer;
      socket.userId = null;
      socket.userRole = null;
    } else {
      // Staff authentication (uses 'id' in token, not 'userId')
      const userId = decoded.userId || decoded.id;
      
      // Debug logging
      console.log('🔍 Socket.IO Auth Debug:', {
        decodedKeys: Object.keys(decoded),
        userId,
        hasId: !!decoded.id,
        hasUserId: !!decoded.userId
      });
      
      const user = await User.findByPk(userId);
      
      if (!user) {
        console.log('❌ User not found in database:', userId);
        return next(new Error('User not found'));
      }

      if (user.isActive === false) {
        return next(new Error('User account is not active'));
      }

      // Attach user info to socket
      socket.actorType = 'staff';
      socket.userId = user.id;
      socket.user = user;
      socket.userRole = user.role;
      socket.customerId = null;
      socket.customer = null;
    }

    // Continue to connection handler
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token expired'));
    }
    return next(new Error('Authentication failed'));
  }
};

module.exports = { authenticateSocket };
