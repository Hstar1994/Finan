/**
 * Auth Controller Tests
 * Tests for authentication and authorization functionality
 */

const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  resetUserPassword,
  refreshToken,
} = require('../../../src/modules/auth/controller');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
}));

jest.mock('../../../src/config', () => ({
  jwt: {
    secret: 'test-secret-key',
    expiresIn: '24h',
  },
}));

jest.mock('../../../src/modules/audit/controller', () => ({
  logAction: jest.fn().mockResolvedValue(true),
}));

const { User } = require('../../../src/database/models');
const { logAction } = require('../../../src/modules/audit/controller');

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockReq = {
      body: {},
      user: null,
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };
      
      mockReq.body = userData;
      
      const mockUser = {
        id: 1,
        ...userData,
        role: 'user',
      };
      
      User.create.mockResolvedValue(mockUser);
      
      await register(mockReq, mockRes, mockNext);
      
      expect(User.create).toHaveBeenCalledWith({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'user',
      });
      
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
        })
      );
    });

    it('should register user with specified role if admin', async () => {
      mockReq.body = {
        email: 'manager@example.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
      };
      
      mockReq.user = { role: 'admin' };
      
      User.create.mockResolvedValue({
        id: 2,
        ...mockReq.body,
      });
      
      await register(mockReq, mockRes, mockNext);
      
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'manager' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should forbid non-admin from creating admin users', async () => {
      mockReq.body = {
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
      };
      
      mockReq.user = { role: 'user' };
      
      await register(mockReq, mockRes, mockNext);
      
      expect(User.create).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should forbid non-admin from creating manager users', async () => {
      mockReq.body = {
        email: 'manager@example.com',
        password: 'password123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager',
      };
      
      mockReq.user = { role: 'manager' }; // Manager trying to create manager
      
      await register(mockReq, mockRes, mockNext);
      
      expect(User.create).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should call next on error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };
      
      const error = new Error('Database error');
      User.create.mockRejectedValue(error);
      
      await register(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        validatePassword: jest.fn().mockResolvedValue(true),
      };
      
      User.findOne.mockResolvedValue(mockUser);
      
      await login(mockReq, mockRes, mockNext);
      
      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockUser.validatePassword).toHaveBeenCalledWith('password123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          data: expect.objectContaining({
            token: expect.any(String),
          }),
        })
      );
    });

    it('should reject login for non-existent user', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      
      User.findOne.mockResolvedValue(null);
      
      await login(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials',
        })
      );
    });

    it('should reject login for inactive user', async () => {
      mockReq.body = {
        email: 'inactive@example.com',
        password: 'password123',
      };
      
      const mockUser = {
        id: 1,
        email: 'inactive@example.com',
        isActive: false,
      };
      
      User.findOne.mockResolvedValue(mockUser);
      
      await login(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials',
        })
      );
    });

    it('should reject login with invalid password', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };
      
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: true,
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      
      User.findOne.mockResolvedValue(mockUser);
      
      await login(mockReq, mockRes, mockNext);
      
      expect(mockUser.validatePassword).toHaveBeenCalledWith('wrongpassword');
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      const error = new Error('Database error');
      User.findOne.mockRejectedValue(error);
      
      await login(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
      
      mockReq.user = mockUser;
      
      await getProfile(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Profile retrieved successfully',
          data: { user: mockUser },
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'old@example.com',
        firstName: 'Old',
        lastName: 'Name',
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockReq.user = mockUser;
      mockReq.body = {
        firstName: 'New',
        lastName: 'Name',
        email: 'new@example.com',
      };
      
      await updateProfile(mockReq, mockRes, mockNext);
      
      expect(mockUser.firstName).toBe('New');
      expect(mockUser.lastName).toBe('Name');
      expect(mockUser.email).toBe('new@example.com');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should update only provided fields', async () => {
      const mockUser = {
        id: 1,
        email: 'old@example.com',
        firstName: 'Old',
        lastName: 'Name',
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockReq.user = mockUser;
      mockReq.body = {
        firstName: 'New',
        // lastName and email not provided
      };
      
      await updateProfile(mockReq, mockRes, mockNext);
      
      expect(mockUser.firstName).toBe('New');
      expect(mockUser.lastName).toBe('Name'); // Unchanged
      expect(mockUser.email).toBe('old@example.com'); // Unchanged
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      const mockUser = {
        id: 1,
        save: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      
      mockReq.user = mockUser;
      mockReq.body = { firstName: 'New' };
      
      await updateProfile(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('changePassword', () => {
    it('should change password successfully with valid current password', async () => {
      const mockUser = {
        id: 1,
        validatePassword: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockReq.user = { id: 1 };
      mockReq.body = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      
      await changePassword(mockReq, mockRes, mockNext);
      
      expect(mockUser.validatePassword).toHaveBeenCalledWith('oldpassword');
      expect(mockUser.password).toBe('newpassword123');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password changed successfully',
        })
      );
    });

    it('should reject password change with incorrect current password', async () => {
      const mockUser = {
        id: 1,
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      
      mockReq.user = { id: 1 };
      mockReq.body = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };
      
      User.findByPk.mockResolvedValue(mockUser);
      
      await changePassword(mockReq, mockRes, mockNext);
      
      expect(mockUser.validatePassword).toHaveBeenCalledWith('wrongpassword');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Current password is incorrect',
        })
      );
    });

    it('should call next on error', async () => {
      const error = new Error('Database error');
      mockReq.user = { id: 1 };
      mockReq.body = { currentPassword: 'old', newPassword: 'new' };
      
      User.findByPk.mockRejectedValue(error);
      
      await changePassword(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('resetUserPassword', () => {
    it('should reset password when admin', async () => {
      const targetUser = {
        id: 2,
        email: 'target@example.com',
        save: jest.fn().mockResolvedValue(true),
      };
      
      mockReq.user = { id: 1, role: 'admin', email: 'admin@example.com' };
      mockReq.body = {
        userId: 2,
        newPassword: 'newpassword123',
      };
      
      User.findByPk.mockResolvedValue(targetUser);
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(targetUser.password).toBe('newpassword123');
      expect(targetUser.save).toHaveBeenCalled();
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'password_reset',
          resourceType: 'User',
          resourceId: 2,
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should forbid non-admin from resetting passwords', async () => {
      mockReq.user = { id: 1, role: 'user', email: 'user@example.com' };
      mockReq.body = {
        userId: 2,
        newPassword: 'newpassword123',
      };
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(User.findByPk).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should return error if userId not provided', async () => {
      mockReq.user = { id: 1, role: 'admin' };
      mockReq.body = {
        newPassword: 'newpassword123',
      };
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return error if newPassword not provided', async () => {
      mockReq.user = { id: 1, role: 'admin' };
      mockReq.body = {
        userId: 2,
      };
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return not found if user does not exist', async () => {
      mockReq.user = { id: 1, role: 'admin' };
      mockReq.body = {
        userId: 999,
        newPassword: 'newpassword123',
      };
      
      User.findByPk.mockResolvedValue(null);
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should call next on error', async () => {
      mockReq.user = { id: 1, role: 'admin' };
      mockReq.body = { userId: 2, newPassword: 'new' };
      
      const error = new Error('Database error');
      User.findByPk.mockRejectedValue(error);
      
      await resetUserPassword(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for active user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
      };
      
      mockReq.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      
      await refreshToken(mockReq, mockRes, mockNext);
      
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token refreshed successfully',
          data: expect.objectContaining({
            token: expect.any(String),
            user: expect.objectContaining({
              id: 1,
              email: 'test@example.com',
            }),
          }),
        })
      );
    });

    it('should reject refresh for non-existent user', async () => {
      mockReq.user = { id: 999 };
      User.findByPk.mockResolvedValue(null);
      
      await refreshToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should reject refresh for inactive user', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        isActive: false,
      };
      
      mockReq.user = { id: 1 };
      User.findByPk.mockResolvedValue(mockUser);
      
      await refreshToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should call next on error', async () => {
      mockReq.user = { id: 1 };
      
      const error = new Error('Database error');
      User.findByPk.mockRejectedValue(error);
      
      await refreshToken(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
