/**
 * Setup Test Database Script
 * Run this before running tests that require database access
 * 
 * Usage: npm run test:setup-db
 */

const { 
  createTestDbIfNotExists, 
  getTestSequelize,
  closeTestDb,
  TEST_DB_CONFIG 
} = require('./helpers/testDb');

async function setupTestDatabase() {
  console.log('🧪 Setting up test database...\n');
  console.log('Configuration:');
  console.log(`  Host: ${TEST_DB_CONFIG.host}`);
  console.log(`  Port: ${TEST_DB_CONFIG.port}`);
  console.log(`  Database: ${TEST_DB_CONFIG.database}`);
  console.log(`  User: ${TEST_DB_CONFIG.username}`);
  console.log('');

  try {
    // Create database if it doesn't exist
    const wasCreated = await createTestDbIfNotExists();
    
    if (wasCreated) {
      console.log('✅ Test database created successfully');
    } else {
      console.log('✅ Test database already exists');
    }

    // Connect and sync tables
    const sequelize = getTestSequelize();
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Sync all models (create tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database tables synchronized');

    // Close connection
    await closeTestDb();
    console.log('✅ Database connection closed');

    console.log('\n🎉 Test database setup complete!');
    console.log('\nYou can now run tests with: npm test');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error setting up test database:', error.message);
    console.error('\nMake sure PostgreSQL is running and accessible.');
    console.error('You may need to create the database manually:');
    console.error(`  CREATE DATABASE ${TEST_DB_CONFIG.database};`);
    
    await closeTestDb();
    process.exit(1);
  }
}

setupTestDatabase();
