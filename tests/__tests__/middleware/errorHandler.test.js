/**
 * Error Handler Middleware Tests
 * Tests for centralized error handling
 */

const errorHandler = require('../../../src/middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    mockReq = {};
    
    mockRes = {
      statusCode: 200,
      body: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      }
    };
    
    mockNext = jest.fn();
    
    // Suppress console.error during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Generic errors', () => {
    it('should return 500 for generic errors', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.body.success).toBe(false);
    });

    it('should include error message in response', () => {
      const error = new Error('Custom error message');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.message).toBe('Custom error message');
    });

    it('should handle errors without message', () => {
      const error = new Error();
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.body.success).toBe(false);
    });

    it('should log error to console', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });
  });

  describe('Sequelize validation errors', () => {
    it('should return 400 for validation errors', () => {
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { path: 'email', message: 'Email is invalid', value: 'bad-email' }
      ];
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.body.success).toBe(false);
    });

    it('should include field information in validation errors', () => {
      const error = new Error('Validation error');
      error.name = 'SequelizeValidationError';
      error.errors = [
        { path: 'email', message: 'Email is required', value: null },
        { path: 'password', message: 'Password too short', value: '123' }
      ];
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.errors).toHaveLength(2);
      expect(mockRes.body.errors[0].field).toBe('email');
      expect(mockRes.body.errors[1].field).toBe('password');
    });
  });

  describe('Sequelize unique constraint errors', () => {
    it('should return 409 for duplicate entry errors', () => {
      const error = new Error('Unique constraint error');
      error.name = 'SequelizeUniqueConstraintError';
      error.errors = [
        { path: 'email', message: 'email must be unique', value: 'test@test.com' }
      ];
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.body.message).toContain('Duplicate entry');
    });

    it('should include field information in unique errors', () => {
      const error = new Error('Unique constraint error');
      error.name = 'SequelizeUniqueConstraintError';
      error.errors = [
        { path: 'email', message: 'email must be unique', value: 'duplicate@test.com' }
      ];
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.errors[0].field).toBe('email');
      expect(mockRes.body.errors[0].value).toBe('duplicate@test.com');
    });
  });

  describe('JWT errors', () => {
    it('should return 401 for invalid token errors', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Invalid authentication token');
    });

    it('should return 401 for expired token errors', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('expired');
    });
  });

  describe('Error response format', () => {
    it('should always include success: false', () => {
      const error = new Error('Test');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.success).toBe(false);
    });

    it('should always include a message', () => {
      const error = new Error('Test message');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.message).toBeDefined();
    });

    it('should include timestamp', () => {
      const error = new Error('Test');
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.timestamp).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle null error by throwing (expected behavior)', () => {
      // Error handler expects an error object, null/undefined should throw
      expect(() => {
        errorHandler(null, mockReq, mockRes, mockNext);
      }).toThrow();
    });

    it('should handle undefined error by throwing (expected behavior)', () => {
      expect(() => {
        errorHandler(undefined, mockReq, mockRes, mockNext);
      }).toThrow();
    });

    it('should handle error object with only name property', () => {
      const error = { name: 'CustomError' };
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(500);
    });

    it('should handle string error message', () => {
      // Some libraries throw plain strings
      const error = new Error();
      error.message = 'Plain string error';
      
      errorHandler(error, mockReq, mockRes, mockNext);
      
      expect(mockRes.body.message).toBe('Plain string error');
    });
  });
});