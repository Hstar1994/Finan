/**
 * CustomerAuth Controller Tests
 */

const mockCustomerAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  changePassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  enableAuth: jest.fn(),
  disableAuth: jest.fn(),
};

const mockApiResponse = {
  created: jest.fn(),
  success: jest.fn(),
  forbidden: jest.fn(),
  error: jest.fn(),
};

const mockAuditLog = {
  create: jest.fn().mockResolvedValue({}),
};

jest.mock('../../../src/modules/auth/customerAuth.service', () => mockCustomerAuthService);
jest.mock('../../../src/utils/apiResponse', () => mockApiResponse);
jest.mock('../../../src/database/models', () => ({
  AuditLog: mockAuditLog,
}));

const controller = require('../../../src/modules/auth/customerAuth.controller');

describe('CustomerAuth Controller', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      actorType: 'staff',
      userRole: 'admin',
      userId: 'user-1',
      customerId: null,
      customer: null,
    };

    mockRes = {};
    mockNext = jest.fn();
  });

  describe('register', () => {
    it('should register a customer and return created', async () => {
      const customer = { id: 'cust-1', authEmail: 'test@example.com' };
      mockCustomerAuthService.register.mockResolvedValue(customer);
      mockReq.body = { authEmail: 'test@example.com', password: 'pass123' };

      await controller.register(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.register).toHaveBeenCalledWith(mockReq.body);
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.auth.registered', entityId: 'cust-1' })
      );
      expect(mockApiResponse.created).toHaveBeenCalledWith(
        mockRes,
        { customer },
        'Customer registered successfully'
      );
    });

    it('should call next on error', async () => {
      mockCustomerAuthService.register.mockRejectedValue(new Error('Reg error'));
      await controller.register(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('login', () => {
    it('should login customer and return success', async () => {
      const result = { customer: { id: 'cust-1' }, token: 'jwt-token' };
      mockCustomerAuthService.login.mockResolvedValue(result);
      mockReq.body = { authEmail: 'test@example.com', password: 'pass123' };

      await controller.login(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.login).toHaveBeenCalledWith('test@example.com', 'pass123');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.auth.login', entityId: 'cust-1' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, result, 'Login successful');
    });

    it('should call next on error', async () => {
      mockCustomerAuthService.login.mockRejectedValue(new Error('Login error'));
      await controller.login(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getProfile', () => {
    it('should return profile for customer', async () => {
      mockReq.actorType = 'customer';
      mockReq.customer = { id: 'cust-1', name: 'Test Customer' };

      await controller.getProfile(mockReq, mockRes, mockNext);

      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { customer: mockReq.customer },
        'Profile retrieved successfully'
      );
    });

    it('should return forbidden for non-customer actor', async () => {
      mockReq.actorType = 'staff';

      await controller.getProfile(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Customer access only');
    });

    it('should call next on error', async () => {
      mockReq.actorType = 'customer';
      mockApiResponse.success.mockImplementation(() => { throw new Error('boom'); });

      await controller.getProfile(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('changePassword', () => {
    it('should change password for customer', async () => {
      mockReq.actorType = 'customer';
      mockReq.customerId = 'cust-1';
      mockReq.body = { currentPassword: 'old', newPassword: 'new123' };
      mockCustomerAuthService.changePassword.mockResolvedValue();

      await controller.changePassword(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.changePassword).toHaveBeenCalledWith('cust-1', 'old', 'new123');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.auth.password_changed' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Password changed successfully');
    });

    it('should return forbidden for non-customer actor', async () => {
      mockReq.actorType = 'staff';

      await controller.changePassword(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(mockRes, 'Customer access only');
    });

    it('should call next on error', async () => {
      mockReq.actorType = 'customer';
      mockCustomerAuthService.changePassword.mockRejectedValue(new Error('Error'));
      await controller.changePassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('requestPasswordReset', () => {
    it('should request a password reset and return token', async () => {
      mockCustomerAuthService.requestPasswordReset.mockResolvedValue('reset-token-123');
      mockReq.body = { authEmail: 'test@example.com' };

      await controller.requestPasswordReset(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { resetToken: 'reset-token-123' },
        'If email exists, a password reset link has been sent'
      );
    });

    it('should call next on error', async () => {
      mockCustomerAuthService.requestPasswordReset.mockRejectedValue(new Error('err'));
      await controller.requestPasswordReset(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockCustomerAuthService.resetPassword.mockResolvedValue();
      mockReq.body = { authEmail: 'test@example.com', resetToken: 'abc', newPassword: 'new123' };

      await controller.resetPassword(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.resetPassword).toHaveBeenCalledWith('test@example.com', 'abc', 'new123');
      expect(mockApiResponse.success).toHaveBeenCalledWith(mockRes, null, 'Password reset successfully');
    });

    it('should call next on error', async () => {
      mockCustomerAuthService.resetPassword.mockRejectedValue(new Error('err'));
      await controller.resetPassword(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('enableAuth', () => {
    it('should enable auth for admin', async () => {
      const customer = { id: 'cust-1', authEnabled: true };
      mockCustomerAuthService.enableAuth.mockResolvedValue(customer);
      mockReq.actorType = 'staff';
      mockReq.userRole = 'admin';
      mockReq.params = { customerId: 'cust-1' };
      mockReq.body = { authEmail: 'test@example.com', password: 'pass123' };

      await controller.enableAuth(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.enableAuth).toHaveBeenCalledWith('cust-1', 'test@example.com', 'pass123');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.auth.enabled', entityId: 'cust-1' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { customer },
        'Customer authentication enabled'
      );
    });

    it('should enable auth for manager', async () => {
      const customer = { id: 'cust-1' };
      mockCustomerAuthService.enableAuth.mockResolvedValue(customer);
      mockReq.actorType = 'staff';
      mockReq.userRole = 'manager';
      mockReq.params = { customerId: 'cust-1' };
      mockReq.body = { authEmail: 'x@y.com', password: 'pw' };

      await controller.enableAuth(mockReq, mockRes, mockNext);

      expect(mockApiResponse.success).toHaveBeenCalled();
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'accountant';

      await controller.enableAuth(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        'Only Admin and Manager can enable customer auth'
      );
    });

    it('should return forbidden for customer actor', async () => {
      mockReq.actorType = 'customer';

      await controller.enableAuth(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalled();
    });

    it('should call next on error', async () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'admin';
      mockReq.params = { customerId: 'cust-1' };
      mockCustomerAuthService.enableAuth.mockRejectedValue(new Error('err'));
      await controller.enableAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('disableAuth', () => {
    it('should disable auth for admin', async () => {
      const customer = { id: 'cust-1', authEnabled: false };
      mockCustomerAuthService.disableAuth.mockResolvedValue(customer);
      mockReq.actorType = 'staff';
      mockReq.userRole = 'admin';
      mockReq.params = { customerId: 'cust-1' };

      await controller.disableAuth(mockReq, mockRes, mockNext);

      expect(mockCustomerAuthService.disableAuth).toHaveBeenCalledWith('cust-1');
      expect(mockAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'customer.auth.disabled', entityId: 'cust-1' })
      );
      expect(mockApiResponse.success).toHaveBeenCalledWith(
        mockRes,
        { customer },
        'Customer authentication disabled'
      );
    });

    it('should return forbidden for non-admin/manager', async () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'accountant';

      await controller.disableAuth(mockReq, mockRes, mockNext);

      expect(mockApiResponse.forbidden).toHaveBeenCalledWith(
        mockRes,
        'Only Admin and Manager can disable customer auth'
      );
    });

    it('should call next on error', async () => {
      mockReq.actorType = 'staff';
      mockReq.userRole = 'admin';
      mockReq.params = { customerId: 'cust-1' };
      mockCustomerAuthService.disableAuth.mockRejectedValue(new Error('err'));
      await controller.disableAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
