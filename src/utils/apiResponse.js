/**
 * Standardized API Response Utility
 * Provides consistent response format across all endpoints
 */

const config = require('../config');

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {Object} meta - Optional metadata (pagination, etc.)
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data = null, message = 'Success', meta = null, statusCode = 200) {
    const response = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      response.meta = meta;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Array|Object} errors - Validation errors or error details
   * @param {number} statusCode - HTTP status code (default: 400)
   */
  static error(res, message = 'Error', errors = null, statusCode = 400) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Created response (for POST requests)
   * @param {Object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return ApiResponse.success(res, data, message, null, 201);
  }

  /**
   * No content response (for DELETE requests)
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   */
  static noContent(res, message = 'Resource deleted successfully') {
    return ApiResponse.success(res, null, message, null, 200);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} message - Not found message
   */
  static notFound(res, message = 'Resource not found') {
    return ApiResponse.error(res, message, null, 404);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Unauthorized message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return ApiResponse.error(res, message, null, 401);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Forbidden message
   */
  static forbidden(res, message = 'Access forbidden') {
    return ApiResponse.error(res, message, null, 403);
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Array of validation errors
   * @param {string} message - Error message
   */
  static validationError(res, errors, message = 'Validation failed') {
    return ApiResponse.error(res, message, errors, 400);
  }

  /**
   * Server error response
   * @param {Object} res - Express response object
   * @param {string} message - Error message
   * @param {Error} error - Error object (optional, for development)
   */
  static serverError(res, message = 'Internal server error', error = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    // Only include error details in development
    if (config.app.env === 'development' && error) {
      response.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    return res.status(500).json(response);
  }

  /**
   * Paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total count of items
   * @param {string} message - Success message
   */
  static paginated(res, data, page, limit, total, message = 'Data retrieved successfully') {
    const totalPages = Math.ceil(total / limit);
    
    const meta = {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    return ApiResponse.success(res, data, message, meta);
  }
}

module.exports = ApiResponse;
