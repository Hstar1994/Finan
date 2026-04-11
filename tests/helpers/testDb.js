/**
 * Test Database Utilities
 * Provides setup and teardown functions for test isolation
 */

const { Sequelize } = require('sequelize');
const config = require('../../src/config');

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || config.database.host || 'localhost',
  port: process.env.TEST_DB_PORT || config.database.port || 5432,
  database: process.env.TEST_DB_NAME || 'finan_test_db',
  username: process.env.TEST_DB_USER || config.database.username || 'finan',
  password: process.env.TEST_DB_PASSWORD || config.database.password || 'finan123',
  dialect: 'postgres',
  logging: false, // Disable SQL logging in tests
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

let testSequelize = null;
let modelsLoaded = false;

/**
 * Get or create a test database connection
 */
function getTestSequelize() {
  if (!testSequelize) {
    testSequelize = new Sequelize(
      TEST_DB_CONFIG.database,
      TEST_DB_CONFIG.username,
      TEST_DB_CONFIG.password,
      {
        host: TEST_DB_CONFIG.host,
        port: TEST_DB_CONFIG.port,
        dialect: TEST_DB_CONFIG.dialect,
        logging: TEST_DB_CONFIG.logging,
        pool: TEST_DB_CONFIG.pool
      }
    );
  }
  return testSequelize;
}

/**
 * Initialize test database with models
 */
async function initializeTestDb() {
  const sequelize = getTestSequelize();
  
  try {
    // Test connection
    await sequelize.authenticate();
    
    // Load models if not already loaded
    if (!modelsLoaded) {
      // Dynamically load models
      const models = require('../../src/database/models');
      
      // Override the models' sequelize instance for testing
      Object.keys(models).forEach(modelName => {
        if (models[modelName].sequelize) {
          models[modelName].sequelize = sequelize;
        }
      });
      
      modelsLoaded = true;
    }
    
    return sequelize;
  } catch (error) {
    console.error('Failed to initialize test database:', error.message);
    throw error;
  }
}

/**
 * Sync all tables (create if not exist)
 */
async function syncTables(options = { force: false }) {
  const sequelize = getTestSequelize();
  await sequelize.sync(options);
}

/**
 * Clear all data from tables (for test isolation)
 */
async function clearAllTables() {
  const sequelize = getTestSequelize();
  
  // Get all table names
  const tables = await sequelize.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  
  // Disable foreign key checks and truncate
  await sequelize.query('SET session_replication_role = replica;');
  
  for (const { tablename } of tables) {
    if (tablename !== 'SequelizeMeta') {
      await sequelize.query(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    }
  }
  
  await sequelize.query('SET session_replication_role = DEFAULT;');
}

/**
 * Close database connection
 */
async function closeTestDb() {
  if (testSequelize) {
    await testSequelize.close();
    testSequelize = null;
    modelsLoaded = false;
  }
}

/**
 * Check if test database exists
 */
async function testDbExists() {
  const adminSequelize = new Sequelize(
    'postgres', // Connect to default postgres database
    TEST_DB_CONFIG.username,
    TEST_DB_CONFIG.password,
    {
      host: TEST_DB_CONFIG.host,
      port: TEST_DB_CONFIG.port,
      dialect: 'postgres',
      logging: false
    }
  );
  
  try {
    const result = await adminSequelize.query(
      `SELECT 1 FROM pg_database WHERE datname = '${TEST_DB_CONFIG.database}'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    await adminSequelize.close();
    return result.length > 0;
  } catch (error) {
    await adminSequelize.close();
    return false;
  }
}

/**
 * Create test database if it doesn't exist
 */
async function createTestDbIfNotExists() {
  const exists = await testDbExists();
  
  if (!exists) {
    const adminSequelize = new Sequelize(
      'postgres',
      TEST_DB_CONFIG.username,
      TEST_DB_CONFIG.password,
      {
        host: TEST_DB_CONFIG.host,
        port: TEST_DB_CONFIG.port,
        dialect: 'postgres',
        logging: false
      }
    );
    
    try {
      await adminSequelize.query(`CREATE DATABASE ${TEST_DB_CONFIG.database}`);
      console.log(`Created test database: ${TEST_DB_CONFIG.database}`);
    } finally {
      await adminSequelize.close();
    }
  }
  
  return !exists; // Returns true if database was created
}

/**
 * Run all pending migrations on test database
 */
async function runMigrations() {
  const { exec } = require('child_process');
  const util = require('util');
  const execPromise = util.promisify(exec);
  
  try {
    // Set test database environment
    const env = {
      ...process.env,
      DB_NAME: TEST_DB_CONFIG.database,
      DB_HOST: TEST_DB_CONFIG.host,
      DB_PORT: TEST_DB_CONFIG.port,
      DB_USER: TEST_DB_CONFIG.username,
      DB_PASSWORD: TEST_DB_CONFIG.password
    };
    
    await execPromise('npx sequelize-cli db:migrate', { env });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

module.exports = {
  getTestSequelize,
  initializeTestDb,
  syncTables,
  clearAllTables,
  closeTestDb,
  testDbExists,
  createTestDbIfNotExists,
  runMigrations,
  TEST_DB_CONFIG
};
