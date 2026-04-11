/**
 * Authentication Helper for Tests
 * Provides utilities for generating test tokens and authenticated requests
 */

const jwt = require('jsonwebtoken');
const config = require('../../src/config');

// Test user data
const TEST_USERS = {
  admin: {
    id: 'test-admin-uuid-0001',
    email: 'admin@test.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin',
    isActive: true
  },
  manager: {
    id: 'test-manager-uuid-0002',
    email: 'manager@test.com',
    firstName: 'Test',
    lastName: 'Manager',
    role: 'manager',
    isActive: true
  },
  employee: {
    id: 'test-employee-uuid-0003',
    email: 'employee@test.com',
    firstName: 'Test',
    lastName: 'Employee',
    role: 'employee',
    isActive: true
  },
  customer: {
    id: 'test-customer-uuid-0004',
    email: 'customer@test.com',
    firstName: 'Test',
    lastName: 'Customer',
    role: 'customer',
    isActive: true,
    customerId: 'test-customer-id-0001'
  },
  inactive: {
    id: 'test-inactive-uuid-0005',
    email: 'inactive@test.com',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'employee',
    isActive: false
  }
};

/**
 * Generate a JWT token for a test user
 * @param {string} userType - 'admin', 'manager', 'employee', 'customer', or 'inactive'
 * @param {Object} overrides - Optional properties to override
 * @param {Object} options - Token options (expiresIn, etc.)
 * @returns {string} JWT token
 */
function generateTestToken(userType = 'admin', overrides = {}, options = {}) {
  const user = { ...TEST_USERS[userType], ...overrides };
  
  const secret = config.jwt?.secret || process.env.JWT_SECRET || 'test-secret-key';
  const expiresIn = options.expiresIn || config.jwt?.expiresIn || '1h';
  
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  // Add customerId for customer role
  if (user.customerId) {
    payload.customerId = user.customerId;
  }
  
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Generate an expired token for testing expiration handling
 * @param {string} userType - User type
 * @returns {string} Expired JWT token
 */
function generateExpiredToken(userType = 'admin') {
  return generateTestToken(userType, {}, { expiresIn: '-1h' });
}

/**
 * Generate an invalid token (wrong secret)
 * @returns {string} Invalid JWT token
 */
function generateInvalidToken() {
  const payload = { id: 'test', email: 'test@test.com', role: 'admin' };
  return jwt.sign(payload, 'wrong-secret-key', { expiresIn: '1h' });
}

/**
 * Get authorization header with Bearer token
 * @param {string} userType - User type
 * @param {Object} overrides - Optional properties to override
 * @returns {Object} Headers object with Authorization
 */
function getAuthHeader(userType = 'admin', overrides = {}) {
  const token = generateTestToken(userType, overrides);
  return {
    Authorization: `Bearer ${token}`
  };
}

/**
 * Decode a token without verification (for testing)
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Verify a token
 * @param {string} token - JWT token
 * @returns {Object} Verified payload
 */
function verifyToken(token) {
  const secret = config.jwt?.secret || process.env.JWT_SECRET || 'test-secret-key';
  return jwt.verify(token, secret);
}

/**
 * Get a test user object
 * @param {string} userType - User type
 * @param {Object} overrides - Optional properties to override
 * @returns {Object} User object
 */
function getTestUser(userType = 'admin', overrides = {}) {
  return { ...TEST_USERS[userType], ...overrides };
}

/**
 * Create a mock request object with authenticated user
 * @param {string} userType - User type
 * @param {Object} overrides - Optional user overrides
 * @returns {Object} Mock request object
 */
function createMockAuthRequest(userType = 'admin', overrides = {}) {
  const user = getTestUser(userType, overrides);
  return {
    user,
    headers: getAuthHeader(userType, overrides),
    get: (header) => {
      if (header.toLowerCase() === 'authorization') {
        return `Bearer ${generateTestToken(userType, overrides)}`;
      }
      return null;
    }
  };
}

/**
 * Create a mock response object
 * @returns {Object} Mock response object with jest spies
 */
function createMockResponse() {
  const res = {
    statusCode: 200,
    body: null,
    headers: {}
  };
  
  res.status = function(code) {
    this.statusCode = code;
    return this;
  };
  
  res.json = function(data) {
    this.body = data;
    return this;
  };
  
  res.send = function(data) {
    this.body = data;
    return this;
  };
  
  res.set = function(header, value) {
    this.headers[header] = value;
    return this;
  };
  
  return res;
}

module.exports = {
  TEST_USERS,
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  getAuthHeader,
  decodeToken,
  verifyToken,
  getTestUser,
  createMockAuthRequest,
  createMockResponse
};
