const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../database/models');
const ApiResponse = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'No authentication token provided');
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.isActive) {
      return ApiResponse.unauthorized(res, 'Invalid or inactive user account');
    }
    
    req.user = user;
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

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return ApiResponse.forbidden(res, 'Insufficient permissions for this action');
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };
