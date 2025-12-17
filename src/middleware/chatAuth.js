const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Customer, ChatConversation, ChatParticipant } = require('../database/models');
const ApiResponse = require('../utils/apiResponse');

/**
 * Enhanced authentication middleware that supports both staff and customer tokens
 */
const authenticateChatUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No authentication token provided');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Determine actor type from token
    if (decoded.type === 'customer') {
      // Customer authentication
      const customer = await Customer.findByPk(decoded.customerId);
      
      if (!customer || !customer.isActive || !customer.authEnabled) {
        return ApiResponse.unauthorized(res, 'Invalid or inactive customer account');
      }
      
      req.actorType = 'customer';
      req.customerId = customer.id;
      req.customer = customer;
    } else {
      // Staff authentication (default)
      const user = await User.findByPk(decoded.id);
      
      if (!user || !user.isActive) {
        return ApiResponse.unauthorized(res, 'Invalid or inactive user account');
      }
      
      req.actorType = 'staff';
      req.userId = user.id;
      req.user = user;
      req.userRole = user.role;
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return ApiResponse.unauthorized(res, 'Invalid authentication token');
    }
    if (error.name === 'TokenExpiredError') {
      return ApiResponse.unauthorized(res, 'Authentication token has expired');
    }
    return ApiResponse.unauthorized(res, 'Authentication failed');
  }
};

/**
 * Middleware to verify user is a participant in the conversation
 */
const canAccessConversation = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    
    // Find active participant
    const where = {
      conversationId,
      leftAt: null
    };
    
    if (req.actorType === 'staff') {
      where.userId = req.userId;
    } else {
      where.customerId = req.customerId;
    }
    
    const participant = await ChatParticipant.findOne({ where });
    
    if (!participant) {
      return ApiResponse.forbidden(res, 'You are not a participant in this conversation');
    }
    
    req.participant = participant;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to verify conversation type restrictions
 * Customers can only access CUSTOMER_DM, not STAFF_GROUP or STAFF_DM
 */
const enforceConversationType = async (req, res, next) => {
  try {
    const conversationId = req.params.id;
    
    const conversation = await ChatConversation.findByPk(conversationId);
    
    if (!conversation) {
      return ApiResponse.notFound(res, 'Conversation not found');
    }
    
    // Customers cannot access staff conversations
    if (req.actorType === 'customer' && conversation.type !== 'CUSTOMER_DM') {
      return ApiResponse.forbidden(res, 'Customers cannot access staff conversations');
    }
    
    // Verify CUSTOMER_DM matches the customer
    if (req.actorType === 'customer' && 
        conversation.type === 'CUSTOMER_DM' && 
        conversation.customerId !== req.customerId) {
      return ApiResponse.forbidden(res, 'Cannot access another customer\'s conversation');
    }
    
    req.conversation = conversation;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access to Admin and Manager only
 */
const adminOrManagerOnly = (req, res, next) => {
  if (req.actorType !== 'staff') {
    return ApiResponse.forbidden(res, 'Staff access only');
  }
  
  if (!['admin', 'manager'].includes(req.userRole)) {
    return ApiResponse.forbidden(res, 'Only Admin and Manager can perform this action');
  }
  
  next();
};

/**
 * Middleware to restrict access to staff only
 */
const staffOnly = (req, res, next) => {
  if (req.actorType !== 'staff') {
    return ApiResponse.forbidden(res, 'Staff access only');
  }
  
  next();
};

module.exports = {
  authenticateChatUser,
  canAccessConversation,
  enforceConversationType,
  adminOrManagerOnly,
  staffOnly
};
