/**
 * Auth Middleware Tests
 * Tests for authentication and authorization middleware
 */

const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../../src/middleware/auth');
const config = require('../../../src/config');

// Mock the User model
jest.mock('../../../src/database/models', () => ({
  User: {
    findByPk: jest.fn()
  }
}));

const { User } = require('../../../src/database/models');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;
  
  beforeEach(() => {
    mockReq = {
      headers: {}
    };
    
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
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    it('should return 401 when no authorization header is provided', async () => {
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.success).toBe(false);
      expect(mockRes.body.message).toContain('No authentication token');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      mockReq.headers.authorization = 'Basic some-token';
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('No authentication token');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Invalid authentication token');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { id: 'test-id', email: 'test@test.com', role: 'admin' },
        config.jwt.secret,
        { expiresIn: '-1h' }
      );
      mockReq.headers.authorization = `Bearer ${expiredToken}`;
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('expired');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not found', async () => {
      const validToken = jwt.sign(
        { id: 'non-existent-id', email: 'test@test.com', role: 'admin' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      User.findByPk.mockResolvedValue(null);
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Invalid or inactive');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is inactive', async () => {
      const validToken = jwt.sign(
        { id: 'inactive-user-id', email: 'test@test.com', role: 'admin' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      User.findByPk.mockResolvedValue({ id: 'inactive-user-id', isActive: false });
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Invalid or inactive');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() and attach user to request when authentication succeeds', async () => {
      const user = {
        id: 'valid-user-id',
        email: 'test@test.com',
        role: 'admin',
        isActive: true
      };
      
      const validToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      User.findByPk.mockResolvedValue(user);
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.statusCode).toBe(200); // Response not modified
    });

    it('should handle database errors gracefully', async () => {
      const validToken = jwt.sign(
        { id: 'test-id', email: 'test@test.com', role: 'admin' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
      mockReq.headers.authorization = `Bearer ${validToken}`;
      User.findByPk.mockRejectedValue(new Error('Database connection error'));
      
      await authenticate(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Authentication failed');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize()', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = authorize('admin');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.message).toContain('Authentication required');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not allowed', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = authorize('admin', 'manager');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.body.message).toContain('Insufficient permissions');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required role', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = authorize('admin', 'manager');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.statusCode).toBe(200); // Response not modified
    });

    it('should call next() when no roles are specified', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = authorize();
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with single role authorization', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = authorize('admin');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with multiple allowed roles', () => {
      mockReq.user = { id: 'test-id', role: 'manager' };
      const middleware = authorize('admin', 'manager', 'user');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
