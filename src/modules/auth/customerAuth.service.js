const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Customer } = require('../../database/models');
const config = require('../../config');
const crypto = require('crypto');

class CustomerAuthService {
  /**
   * Register a new customer with auth credentials
   * @param {Object} data - Customer data with auth fields
   * @returns {Promise<Object>} Created customer (without password hash)
   */
  async register(data) {
    const { 
      name, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      country, 
      zipCode,
      authEmail, 
      password 
    } = data;
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const customer = await Customer.create({
      name,
      email,
      phone,
      address,
      city,
      state,
      country,
      zipCode,
      authEnabled: true,
      authEmail,
      passwordHash,
      passwordUpdatedAt: new Date(),
      failedLoginCount: 0,
      balance: 0,
      creditLimit: 0,
      isActive: true
    });
    
    // Remove sensitive data before returning
    const customerData = customer.toJSON();
    delete customerData.passwordHash;
    delete customerData.resetTokenHash;
    
    return customerData;
  }

  /**
   * Login a customer
   * @param {string} authEmail - Customer's auth email
   * @param {string} password - Customer's password
   * @returns {Promise<Object>} Token and customer data
   */
  async login(authEmail, password) {
    const customer = await Customer.findOne({ 
      where: { authEmail } 
    });
    
    if (!customer || !customer.isActive) {
      throw new Error('Invalid credentials');
    }
    
    // Check if customer can login
    if (!customer.canLogin()) {
      if (customer.isLocked()) {
        throw new Error('Account is locked due to multiple failed login attempts. Please try again later.');
      }
      if (!customer.authEnabled) {
        throw new Error('Customer login is not enabled for this account');
      }
      if (!customer.passwordHash) {
        throw new Error('No password set for this account');
      }
    }
    
    // Validate password
    const isValid = await bcrypt.compare(password, customer.passwordHash);
    
    if (!isValid) {
      await customer.recordFailedLogin();
      throw new Error('Invalid credentials');
    }
    
    // Successful login
    await customer.recordSuccessfulLogin();
    
    // Generate JWT with type field
    const token = jwt.sign(
      { 
        id: `customer:${customer.id}`,
        customerId: customer.id,
        email: customer.authEmail,
        type: 'customer',
        name: customer.name
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    // Remove sensitive data
    const customerData = customer.toJSON();
    delete customerData.passwordHash;
    delete customerData.resetTokenHash;
    
    return { token, customer: customerData };
  }

  /**
   * Change customer password
   * @param {string} customerId - Customer ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(customerId, currentPassword, newPassword) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, customer.passwordHash);
    
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    customer.passwordHash = passwordHash;
    customer.passwordUpdatedAt = new Date();
    await customer.save();
  }

  /**
   * Request password reset
   * @param {string} authEmail - Customer's auth email
   * @returns {Promise<string>} Reset token (for email)
   */
  async requestPasswordReset(authEmail) {
    const customer = await Customer.findOne({ 
      where: { authEmail } 
    });
    
    if (!customer) {
      // Don't reveal if email exists
      return null;
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    
    customer.resetTokenHash = resetTokenHash;
    customer.resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await customer.save();
    
    return resetToken;
  }

  /**
   * Reset password using token
   * @param {string} authEmail - Customer's auth email
   * @param {string} resetToken - Reset token from email
   * @param {string} newPassword - New password
   */
  async resetPassword(authEmail, resetToken, newPassword) {
    const customer = await Customer.findOne({ 
      where: { authEmail } 
    });
    
    if (!customer || !customer.resetTokenHash || !customer.resetTokenExpiresAt) {
      throw new Error('Invalid or expired reset token');
    }
    
    // Check token expiry
    if (new Date() > customer.resetTokenExpiresAt) {
      throw new Error('Reset token has expired');
    }
    
    // Verify reset token
    const isValid = await bcrypt.compare(resetToken, customer.resetTokenHash);
    
    if (!isValid) {
      throw new Error('Invalid reset token');
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    customer.passwordHash = passwordHash;
    customer.passwordUpdatedAt = new Date();
    customer.resetTokenHash = null;
    customer.resetTokenExpiresAt = null;
    customer.failedLoginCount = 0;
    customer.lockedUntil = null;
    await customer.save();
  }

  /**
   * Enable customer authentication
   * @param {string} customerId - Customer ID
   * @param {string} authEmail - Auth email to set
   * @param {string} password - Initial password
   */
  async enableAuth(customerId, authEmail, password) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    // Check if authEmail is already in use
    if (authEmail) {
      const existing = await Customer.findOne({
        where: { authEmail }
      });
      
      if (existing && existing.id !== customerId) {
        throw new Error('Auth email is already in use');
      }
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    customer.authEnabled = true;
    customer.authEmail = authEmail;
    customer.passwordHash = passwordHash;
    customer.passwordUpdatedAt = new Date();
    await customer.save();
    
    return customer;
  }

  /**
   * Disable customer authentication
   * @param {string} customerId - Customer ID
   */
  async disableAuth(customerId) {
    const customer = await Customer.findByPk(customerId);
    
    if (!customer) {
      throw new Error('Customer not found');
    }
    
    customer.authEnabled = false;
    await customer.save();
    
    return customer;
  }

  /**
   * Verify customer JWT token
   * @param {string} token - JWT token
   * @returns {Promise<Object>} Decoded token with customer data
   */
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      if (decoded.type !== 'customer') {
        throw new Error('Invalid token type');
      }
      
      const customer = await Customer.findByPk(decoded.customerId);
      
      if (!customer || !customer.isActive || !customer.authEnabled) {
        throw new Error('Customer account is inactive');
      }
      
      return { ...decoded, customer };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

module.exports = new CustomerAuthService();
