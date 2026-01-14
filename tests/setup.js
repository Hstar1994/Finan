/**
 * Test Setup File
 * Runs before all tests to configure the test environment
 */

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_NAME = 'finan_test_db';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Increase default timeout for database operations
jest.setTimeout(30000);

// Global test utilities
const { closeTestDb } = require('./helpers/testDb');

// Cleanup after all tests
afterAll(async () => {
  try {
    await closeTestDb();
  } catch (error) {
    console.error('Error closing test database:', error.message);
  }
});

// Optional: Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
