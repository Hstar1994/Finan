/**
 * Customer Auth Service Tests
 * Tests for customer authentication functionality
 */

const CustomerAuthService = require('../../../src/modules/auth/customerAuth.service');

// Mock dependencies
jest.mock('../../../src/database/models', () => ({
  Customer: {
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

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Customer } = require('../../../src/database/models');

describe('CustomerAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new customer', async () => {
      const customerData = {
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '1234567890',
        authEmail: 'auth@example.com',
        password: 'password123',
      };
      
      const mockCustomer = {
        id: 1,
        ...customerData,
        passwordHash: 'hashed-password',
        toJSON: () => ({
          id: 1,
          name: customerData.name,
          email: customerData.email,
          authEmail: customerData.authEmail,
          passwordHash: 'hashed-password',
          resetTokenHash: null,
        }),
      };
      
      Customer.create.mockResolvedValue(mockCustomer);
      
      const result = await CustomerAuthService.register(customerData);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(Customer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: customerData.name,
          email: customerData.email,
          authEmail: customerData.authEmail,
          passwordHash: 'hashed-password',
          authEnabled: true,
        })
      );
      expect(result.passwordHash).toBeUndefined();
      expect(result.resetTokenHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login a customer with valid credentials', async () => {
      const mockCustomer = {
        id: 1,
        authEmail: 'auth@example.com',
        name: 'Test Customer',
        isActive: true,
        authEnabled: true,
        passwordHash: 'hashed-password',
        canLogin: jest.fn().mockReturnValue(true),
        isLocked: jest.fn().mockReturnValue(false),
        recordSuccessfulLogin: jest.fn().mockResolvedValue(true),
        recordFailedLogin: jest.fn().mockResolvedValue(true),
        toJSON: () => ({
          id: 1,
          name: 'Test Customer',
          authEmail: 'auth@example.com',
          passwordHash: 'hashed-password',
        }),
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(true);
      
      const result = await CustomerAuthService.login('auth@example.com', 'password123');
      
      expect(Customer.findOne).toHaveBeenCalledWith({
        where: { authEmail: 'auth@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockCustomer.recordSuccessfulLogin).toHaveBeenCalled();
      expect(result.token).toBeDefined();
      expect(result.customer.passwordHash).toBeUndefined();
    });

    it('should throw error for non-existent customer', async () => {
      Customer.findOne.mockResolvedValue(null);
      
      await expect(
        CustomerAuthService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for inactive customer', async () => {
      const mockCustomer = {
        id: 1,
        isActive: false,
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      
      await expect(
        CustomerAuthService.login('auth@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for locked account', async () => {
      const mockCustomer = {
        id: 1,
        isActive: true,
        canLogin: jest.fn().mockReturnValue(false),
        isLocked: jest.fn().mockReturnValue(true),
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      
      await expect(
        CustomerAuthService.login('auth@example.com', 'password')
      ).rejects.toThrow('Account is locked');
    });

    it('should record failed login on invalid password', async () => {
      const mockCustomer = {
        id: 1,
        isActive: true,
        canLogin: jest.fn().mockReturnValue(true),
        recordFailedLogin: jest.fn().mockResolvedValue(true),
        passwordHash: 'hashed-password',
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(
        CustomerAuthService.login('auth@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
      
      expect(mockCustomer.recordFailedLogin).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockCustomer = {
        id: 1,
        passwordHash: 'old-hash',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(true);
      
      await CustomerAuthService.changePassword(1, 'oldpassword', 'newpassword');
      
      expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'old-hash');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should throw error for non-existent customer', async () => {
      Customer.findByPk.mockResolvedValue(null);
      
      await expect(
        CustomerAuthService.changePassword(999, 'old', 'new')
      ).rejects.toThrow('Customer not found');
    });

    it('should throw error for incorrect current password', async () => {
      const mockCustomer = {
        id: 1,
        passwordHash: 'hashed-password',
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(
        CustomerAuthService.changePassword(1, 'wrongpassword', 'new')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('requestPasswordReset', () => {
    it('should return reset token for valid email', async () => {
      const mockCustomer = {
        id: 1,
        authEmail: 'auth@example.com',
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      
      const result = await CustomerAuthService.requestPasswordReset('auth@example.com');
      
      expect(result).toBeTruthy();
      expect(result.length).toBe(64); // 32 bytes = 64 hex chars
      expect(mockCustomer.resetTokenHash).toBeDefined();
      expect(mockCustomer.resetTokenExpiresAt).toBeDefined();
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should return null for non-existent email (no leak)', async () => {
      Customer.findOne.mockResolvedValue(null);
      
      const result = await CustomerAuthService.requestPasswordReset('nonexistent@example.com');
      
      expect(result).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockCustomer = {
        id: 1,
        authEmail: 'auth@example.com',
        resetTokenHash: 'hashed-token',
        resetTokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(true);
      
      await CustomerAuthService.resetPassword('auth@example.com', 'valid-token', 'newpassword');
      
      expect(mockCustomer.passwordHash).toBe('hashed-password');
      expect(mockCustomer.resetTokenHash).toBeNull();
      expect(mockCustomer.resetTokenExpiresAt).toBeNull();
      expect(mockCustomer.failedLoginCount).toBe(0);
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should throw error for expired token', async () => {
      const mockCustomer = {
        id: 1,
        resetTokenHash: 'hashed-token',
        resetTokenExpiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      
      await expect(
        CustomerAuthService.resetPassword('auth@example.com', 'token', 'new')
      ).rejects.toThrow('Reset token has expired');
    });

    it('should throw error for invalid token', async () => {
      const mockCustomer = {
        id: 1,
        resetTokenHash: 'hashed-token',
        resetTokenExpiresAt: new Date(Date.now() + 3600000),
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      bcrypt.compare.mockResolvedValue(false);
      
      await expect(
        CustomerAuthService.resetPassword('auth@example.com', 'invalid-token', 'new')
      ).rejects.toThrow('Invalid reset token');
    });

    it('should throw error if no reset token set', async () => {
      const mockCustomer = {
        id: 1,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      };
      
      Customer.findOne.mockResolvedValue(mockCustomer);
      
      await expect(
        CustomerAuthService.resetPassword('auth@example.com', 'token', 'new')
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('enableAuth', () => {
    it('should enable auth for customer', async () => {
      const mockCustomer = {
        id: 1,
        authEnabled: false,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Customer.findOne.mockResolvedValue(null); // No duplicate
      
      await CustomerAuthService.enableAuth(1, 'auth@example.com', 'password');
      
      expect(mockCustomer.authEnabled).toBe(true);
      expect(mockCustomer.authEmail).toBe('auth@example.com');
      expect(mockCustomer.passwordHash).toBe('hashed-password');
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should throw error if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      
      await expect(
        CustomerAuthService.enableAuth(999, 'auth@example.com', 'password')
      ).rejects.toThrow('Customer not found');
    });

    it('should throw error if authEmail already in use', async () => {
      const mockCustomer = {
        id: 1,
      };
      const existingCustomer = {
        id: 2,
        authEmail: 'auth@example.com',
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      Customer.findOne.mockResolvedValue(existingCustomer);
      
      await expect(
        CustomerAuthService.enableAuth(1, 'auth@example.com', 'password')
      ).rejects.toThrow('Auth email is already in use');
    });
  });

  describe('disableAuth', () => {
    it('should disable auth for customer', async () => {
      const mockCustomer = {
        id: 1,
        authEnabled: true,
        save: jest.fn().mockResolvedValue(true),
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      
      await CustomerAuthService.disableAuth(1);
      
      expect(mockCustomer.authEnabled).toBe(false);
      expect(mockCustomer.save).toHaveBeenCalled();
    });

    it('should throw error if customer not found', async () => {
      Customer.findByPk.mockResolvedValue(null);
      
      await expect(
        CustomerAuthService.disableAuth(999)
      ).rejects.toThrow('Customer not found');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid customer token', async () => {
      const mockCustomer = {
        id: 1,
        name: 'Test Customer',
        isActive: true,
        authEnabled: true,
      };
      
      // Create a real token for testing
      const token = jwt.sign(
        { id: 'customer:1', customerId: 1, type: 'customer' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      
      const result = await CustomerAuthService.verifyToken(token);
      
      expect(result.customerId).toBe(1);
      expect(result.type).toBe('customer');
      expect(result.customer).toBeDefined();
    });

    it('should throw error for invalid token type', async () => {
      const token = jwt.sign(
        { id: 1, type: 'staff' }, // Wrong type
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      await expect(
        CustomerAuthService.verifyToken(token)
      ).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error for inactive customer', async () => {
      const token = jwt.sign(
        { id: 'customer:1', customerId: 1, type: 'customer' },
        'test-secret-key',
        { expiresIn: '24h' }
      );
      
      const mockCustomer = {
        id: 1,
        isActive: false,
      };
      
      Customer.findByPk.mockResolvedValue(mockCustomer);
      
      await expect(
        CustomerAuthService.verifyToken(token)
      ).rejects.toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', async () => {
      const token = jwt.sign(
        { id: 'customer:1', customerId: 1, type: 'customer' },
        'test-secret-key',
        { expiresIn: '-1h' } // Already expired
      );
      
      await expect(
        CustomerAuthService.verifyToken(token)
      ).rejects.toThrow('Invalid or expired token');
    });
  });
});
