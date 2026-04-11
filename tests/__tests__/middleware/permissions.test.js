/**
 * Permissions Middleware Tests
 * Tests for permission-based authorization middleware
 */

const {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin
} = require('../../../src/middleware/permissions');
const { PERMISSIONS } = require('../../../src/utils/permissions');

describe('Permissions Middleware', () => {
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
  });

  describe('requirePermission()', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requirePermission(PERMISSIONS.USER_VIEW);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.body.success).toBe(false);
      expect(mockRes.body.message).toContain('Authentication required');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks required permission', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requirePermission(PERMISSIONS.USER_DELETE);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.body.success).toBe(false);
      expect(mockRes.body.message).toContain('Insufficient permissions');
      expect(mockRes.body.required).toBe(PERMISSIONS.USER_DELETE);
      expect(mockRes.body.userRole).toBe('user');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required permission', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = requirePermission(PERMISSIONS.USER_DELETE);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.statusCode).toBe(200);
    });

    it('should work with different roles', () => {
      mockReq.user = { id: 'test-id', role: 'manager' };
      const middleware = requirePermission(PERMISSIONS.CUSTOMER_VIEW);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAnyPermission()', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireAnyPermission([
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.USER_CREATE
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks all permissions', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireAnyPermission([
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.body.required).toContain('One of');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has at least one permission', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireAnyPermission([
        PERMISSIONS.USER_DELETE,      // doesn't have
        PERMISSIONS.CUSTOMER_VIEW     // has this
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() when admin has any permissions', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = requireAnyPermission([
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireAllPermissions()', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireAllPermissions([
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.USER_CREATE
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user lacks any required permission', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireAllPermissions([
        PERMISSIONS.CUSTOMER_VIEW,    // has this
        PERMISSIONS.USER_DELETE       // doesn't have
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.body.required).toContain('All of');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has all permissions', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireAllPermissions([
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_CREATE,
        PERMISSIONS.INVOICE_VIEW
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() when admin has all permissions', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = requireAllPermissions([
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.AUDIT_VIEW
      ]);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole()', () => {
    it('should return 401 when user is not authenticated', () => {
      const middleware = requireRole('admin');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user role does not match', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireRole('admin');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockRes.body.message).toContain('Insufficient privileges');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user has required role', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      const middleware = requireRole('admin');
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should work with array of roles', () => {
      mockReq.user = { id: 'test-id', role: 'manager' };
      const middleware = requireRole(['admin', 'manager']);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 when user role not in array', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      const middleware = requireRole(['admin', 'manager']);
      
      middleware(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin()', () => {
    it('should return 401 when user is not authenticated', () => {
      requireAdmin(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', () => {
      mockReq.user = { id: 'test-id', role: 'manager' };
      
      requireAdmin(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user is admin', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      
      requireAdmin(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireManagerOrAdmin()', () => {
    it('should return 401 when user is not authenticated', () => {
      requireManagerOrAdmin(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin or manager', () => {
      mockReq.user = { id: 'test-id', role: 'user' };
      
      requireManagerOrAdmin(mockReq, mockRes, mockNext);
      
      expect(mockRes.statusCode).toBe(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next() when user is admin', () => {
      mockReq.user = { id: 'test-id', role: 'admin' };
      
      requireManagerOrAdmin(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next() when user is manager', () => {
      mockReq.user = { id: 'test-id', role: 'manager' };
      
      requireManagerOrAdmin(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
