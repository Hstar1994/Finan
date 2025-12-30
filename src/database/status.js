const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Migration Status Checker
 * 
 * This script displays the current status of database migrations.
 * Shows which migrations have been executed and which are pending.
 * 
 * Usage:
 *   npm run db:status
 */

async function checkMigrationStatus() {
  const sequelize = new Sequelize(config.database.url, {
    dialect: config.database.dialect,
    logging: false, // Quiet for status check
    define: {
      timestamps: true,
      underscored: false
    }
  });

  try {
    logger.info('📊 Checking migration status...\n');

    // Test database connection
    await sequelize.authenticate();

    // Get Sequelize Umzug instance for migrations
    const { Umzug, SequelizeStorage } = require('umzug');
    const path = require('path');

    const umzug = new Umzug({
      migrations: {
        glob: path.join(__dirname, 'migrations', '*.js')
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console
    });

    // Get executed and pending migrations
    const executedMigrations = await umzug.executed();
    const pendingMigrations = await umzug.pending();

    // Display summary
    logger.info('='.repeat(60));
    logger.info('MIGRATION STATUS SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`Database: ${config.database.dialect}`);
    logger.info(`Environment: ${config.app.env}`);
    logger.info('-'.repeat(60));
    logger.info(`✅ Executed: ${executedMigrations.length} migration(s)`);
    logger.info(`⏳ Pending:  ${pendingMigrations.length} migration(s)`);
    logger.info('='.repeat(60));

    // Display executed migrations
    if (executedMigrations.length > 0) {
      logger.info('\n✅ EXECUTED MIGRATIONS:');
      logger.info('-'.repeat(60));
      executedMigrations.forEach((migration, index) => {
        logger.info(`${index + 1}. ${migration.name}`);
      });
    } else {
      logger.info('\n⚠️  No migrations have been executed yet');
    }

    // Display pending migrations
    if (pendingMigrations.length > 0) {
      logger.info('\n⏳ PENDING MIGRATIONS:');
      logger.info('-'.repeat(60));
      pendingMigrations.forEach((migration, index) => {
        logger.info(`${index + 1}. ${migration.name}`);
      });
      logger.info('\n💡 Run "npm run db:migrate" to execute pending migrations');
    } else {
      logger.info('\n✅ All migrations are up to date!');
    }

    logger.info('\n' + '='.repeat(60));

    // Show rollback info if there are executed migrations
    if (executedMigrations.length > 0) {
      logger.info('\n💡 ROLLBACK COMMANDS:');
      logger.info('  npm run db:rollback           - Rollback last migration');
      logger.info('  npm run db:rollback -- 2      - Rollback last 2 migrations');
      logger.info('  npm run db:rollback:all       - Rollback all migrations');
    }

  } catch (error) {
    logger.error('❌ Failed to check migration status:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run status check
checkMigrationStatus()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Status check failed:', error);
    process.exit(1);
  });
