const ApiResponse = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return ApiResponse.validationError(res, errors, 'Database validation error');
  }
  
  // Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return ApiResponse.error(res, 'Duplicate entry detected', errors, 409);
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid authentication token');
  }
  
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Authentication token has expired');
  }
  
  // Default error
  return ApiResponse.serverError(
    res, 
    err.message || 'Internal server error',
    process.env.NODE_ENV === 'development' ? err : null
  );
};

module.exports = errorHandler;
