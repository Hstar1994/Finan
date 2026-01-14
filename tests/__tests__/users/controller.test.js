/**
 * Users Controller Tests
 * Tests for user management functionality
 */

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
} = require('../../../src/modules/users/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  User: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  AuditLog: {
    create: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

const { User, AuditLog } = require('../../../src/database/models');

describe('Users Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      query: {},
      params: {},
      body: {},
      user: { id: 1, email: 'admin@example.com', role: 'admin' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('getAllUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 1, email: 'user1@test.com', firstName: 'User', lastName: 'One' },
        { id: 2, email: 'user2@test.com', firstName: 'User', lastName: 'Two' },
      ];
      
      User.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockUsers,
      });
      
      mockReq.query = { page: '1', limit: '10' };
      
      await getAllUsers(mockReq, mockRes, mockNext);
      
      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
          order: [['createdAt', 'DESC']],
          attributes: { exclude: ['password'] },
        })
      );
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        pagination: {
          total: 2,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should filter by role', async () => {
      User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { role: 'admin' };
      
      await getAllUsers(mockReq, mockRes, mockNext);
      
      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'admin' }),
        })
      );
    });

    it('should filter by isActive', async () => {
      User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { isActive: 'true' };
      
      await getAllUsers(mockReq, mockRes, mockNext);
      
      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should search by email, firstName, or lastName', async () => {
      User.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
      
      mockReq.query = { search: 'john' };
      
      await getAllUsers(mockReq, mockRes, mockNext);
      
      // Verify the call was made with a where clause containing Op.or (Symbol)
      expect(User.findAndCountAll).toHaveBeenCalled();
      const callArgs = User.findAndCountAll.mock.calls[0][0];
      expect(callArgs.where).toBeDefined();
      // Check that the where clause has a Symbol key (Op.or)
      const symbolKeys = Object.getOwnPropertySymbols(callArgs.where);
      expect(symbolKeys.length).toBeGreaterThan(0);
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.findAndCountAll.mockRejectedValue(error);
      
      await getAllUsers(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      
      await getUserById(mockReq, mockRes, mockNext);
      
      expect(User.findByPk).toHaveBeenCalledWith('1', {
        attributes: { exclude: ['password'] },
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser,
      });
    });

    it('should return 404 if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await getUserById(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await getUserById(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        email: 'new@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'user',
      };
      
      const mockUser = {
        id: 2,
        ...userData,
        toJSON: () => ({ id: 2, ...userData }),
      };
      
      User.findOne.mockResolvedValue(null); // No existing user
      User.create.mockResolvedValue(mockUser);
      
      mockReq.body = userData;
      
      await createUser(mockReq, mockRes, mockNext);
      
      expect(User.create).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user',
      });
      expect(AuditLog.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User created successfully',
        })
      );
    });

    it('should return 400 if email is missing', async () => {
      mockReq.body = {
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };
      
      await createUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email, password, firstName, and lastName are required',
      });
    });

    it('should return 400 for invalid role', async () => {
      mockReq.body = {
        email: 'new@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        role: 'superadmin', // Invalid role
      };
      
      await createUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Role must be one of: admin, manager, user',
      });
    });

    it('should return 400 if email already exists', async () => {
      mockReq.body = {
        email: 'existing@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };
      
      User.findOne.mockResolvedValue({ id: 1, email: 'existing@test.com' });
      
      await createUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      mockReq.body = {
        email: 'new@test.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };
      
      User.findOne.mockResolvedValue(null);
      User.create.mockRejectedValue(error);
      
      await createUser(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const mockUser = {
        id: 2,
        email: 'old@test.com',
        firstName: 'Old',
        lastName: 'Name',
        role: 'user',
        update: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: 2,
          email: 'new@test.com',
          firstName: 'New',
          lastName: 'Name',
          role: 'user',
        }),
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue(null); // No duplicate email
      
      mockReq.params.id = '2';
      mockReq.body = { email: 'new@test.com', firstName: 'New' };
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockUser.update).toHaveBeenCalledWith({
        email: 'new@test.com',
        firstName: 'New',
      });
      expect(AuditLog.create).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User updated successfully',
        })
      );
    });

    it('should return 404 if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should prevent self-deactivation', async () => {
      const mockUser = {
        id: 1, // Same as req.user.id
        email: 'admin@example.com',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      mockReq.body = { isActive: false };
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot deactivate your own account',
      });
    });

    it('should prevent self-demotion from admin', async () => {
      const mockUser = {
        id: 1, // Same as req.user.id
        email: 'admin@example.com',
        role: 'admin',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      mockReq.body = { role: 'user' };
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot change your own admin role',
      });
    });

    it('should return 400 for duplicate email', async () => {
      const mockUser = {
        id: 2,
        email: 'old@test.com',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      User.findOne.mockResolvedValue({ id: 3, email: 'existing@test.com' });
      
      mockReq.params.id = '2';
      mockReq.body = { email: 'existing@test.com' };
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with this email already exists',
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await updateUser(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = {
        id: 2,
        email: 'user@test.com',
        role: 'user',
        destroy: jest.fn().mockResolvedValue(true),
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      mockReq.params.id = '2';
      
      await deleteUser(mockReq, mockRes, mockNext);
      
      expect(AuditLog.create).toHaveBeenCalled();
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should return 404 if user not found', async () => {
      User.findByPk.mockResolvedValue(null);
      mockReq.params.id = '999';
      
      await deleteUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should prevent self-deletion', async () => {
      const mockUser = {
        id: 1, // Same as req.user.id
        email: 'admin@example.com',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      mockReq.params.id = '1';
      
      await deleteUser(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete your own account',
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.findByPk.mockRejectedValue(error);
      mockReq.params.id = '1';
      
      await deleteUser(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      User.count.mockImplementation(({ where } = {}) => {
        if (!where) return Promise.resolve(10);
        if (where.isActive) return Promise.resolve(8);
        if (where.role === 'admin') return Promise.resolve(2);
        if (where.role === 'manager') return Promise.resolve(3);
        if (where.role === 'user') return Promise.resolve(5);
        return Promise.resolve(0);
      });
      
      await getUserStats(mockReq, mockRes, mockNext);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 10,
          active: 8,
          inactive: 2,
          byRole: {
            admin: 2,
            manager: 3,
            user: 5,
          },
        },
      });
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      User.count.mockRejectedValue(error);
      
      await getUserStats(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
