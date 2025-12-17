const customerAuthService = require('./customerAuth.service');
const ApiResponse = require('../../utils/apiResponse');
const { auditLog } = require('../audit/audit.service');

class CustomerAuthController {
  /**
   * Register a new customer with auth credentials
   * POST /api/v1/auth/customer/register
   * Public endpoint
   */
  async register(req, res, next) {
    try {
      const customer = await customerAuthService.register(req.body);
      
      await auditLog(
        'customer.auth.registered',
        'Customer',
        customer.id,
        null,
        customer.id,
        { authEmail: customer.authEmail }
      );
      
      return ApiResponse.created(res, { customer }, 'Customer registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login as a customer
   * POST /api/v1/auth/customer/login
   * Public endpoint
   */
  async login(req, res, next) {
    try {
      const { authEmail, password } = req.body;
      
      const result = await customerAuthService.login(authEmail, password);
      
      await auditLog(
        'customer.auth.login',
        'Customer',
        result.customer.id,
        null,
        result.customer.id,
        { authEmail }
      );
      
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current customer profile
   * GET /api/v1/auth/customer/profile
   * Auth: Customer only
   */
  async getProfile(req, res, next) {
    try {
      if (req.actorType !== 'customer') {
        return ApiResponse.forbidden(res, 'Customer access only');
      }
      
      return ApiResponse.success(res, { customer: req.customer }, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change customer password
   * POST /api/v1/auth/customer/change-password
   * Auth: Customer only
   */
  async changePassword(req, res, next) {
    try {
      if (req.actorType !== 'customer') {
        return ApiResponse.forbidden(res, 'Customer access only');
      }
      
      const { currentPassword, newPassword } = req.body;
      
      await customerAuthService.changePassword(req.customerId, currentPassword, newPassword);
      
      await auditLog(
        'customer.auth.password_changed',
        'Customer',
        req.customerId,
        null,
        req.customerId,
        {}
      );
      
      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request password reset
   * POST /api/v1/auth/customer/forgot-password
   * Public endpoint
   */
  async requestPasswordReset(req, res, next) {
    try {
      const { authEmail } = req.body;
      
      const resetToken = await customerAuthService.requestPasswordReset(authEmail);
      
      // In production, send resetToken via email
      // For now, return it in response (NOT SECURE IN PRODUCTION)
      
      return ApiResponse.success(
        res, 
        { resetToken }, // Remove in production
        'If email exists, a password reset link has been sent'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password using token
   * POST /api/v1/auth/customer/reset-password
   * Public endpoint
   */
  async resetPassword(req, res, next) {
    try {
      const { authEmail, resetToken, newPassword } = req.body;
      
      await customerAuthService.resetPassword(authEmail, resetToken, newPassword);
      
      return ApiResponse.success(res, null, 'Password reset successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enable customer authentication (Staff only)
   * POST /api/v1/customers/:customerId/enable-auth
   * Auth: Admin/Manager only
   */
  async enableAuth(req, res, next) {
    try {
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can enable customer auth');
      }
      
      const { customerId } = req.params;
      const { authEmail, password } = req.body;
      
      const customer = await customerAuthService.enableAuth(customerId, authEmail, password);
      
      await auditLog(
        'customer.auth.enabled',
        'Customer',
        customerId,
        req.userId,
        customerId,
        { authEmail }
      );
      
      return ApiResponse.success(res, { customer }, 'Customer authentication enabled');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disable customer authentication (Staff only)
   * POST /api/v1/customers/:customerId/disable-auth
   * Auth: Admin/Manager only
   */
  async disableAuth(req, res, next) {
    try {
      if (req.actorType !== 'staff' || !['admin', 'manager'].includes(req.userRole)) {
        return ApiResponse.forbidden(res, 'Only Admin and Manager can disable customer auth');
      }
      
      const { customerId } = req.params;
      
      const customer = await customerAuthService.disableAuth(customerId);
      
      await auditLog(
        'customer.auth.disabled',
        'Customer',
        customerId,
        req.userId,
        customerId,
        {}
      );
      
      return ApiResponse.success(res, { customer }, 'Customer authentication disabled');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CustomerAuthController();
