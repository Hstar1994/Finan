const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Migration Rollback Script
 * 
 * This script allows rolling back database migrations safely.
 * It supports rolling back a specific number of migrations.
 * 
 * Usage:
 *   npm run db:rollback          - Rollback last migration
 *   npm run db:rollback -- 2     - Rollback last 2 migrations
 *   npm run db:rollback:all      - Rollback all migrations
 */

async function rollbackMigrations(steps = 1) {
  const sequelize = new Sequelize(config.database.url, {
    dialect: config.database.dialect,
    logging: (msg) => logger.debug(msg),
    define: {
      timestamps: true,
      underscored: false
    }
  });

  try {
    logger.info('🔄 Starting migration rollback...');
    logger.info(`Rolling back ${steps === 'all' ? 'all' : steps} migration(s)`);

    // Test database connection
    await sequelize.authenticate();
    logger.info('✓ Database connection established');

    // Get Sequelize Umzug instance for migrations
    const { Umzug, SequelizeStorage } = require('umzug');
    const path = require('path');

    const umzug = new Umzug({
      migrations: {
        glob: path.join(__dirname, 'migrations', '*.js')
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: {
        info: (msg) => logger.info(msg),
        warn: (msg) => logger.warn(msg),
        error: (msg) => logger.error(msg),
        debug: (msg) => logger.debug(msg)
      }
    });

    // Get executed migrations
    const executedMigrations = await umzug.executed();
    
    if (executedMigrations.length === 0) {
      logger.warn('⚠️  No migrations to rollback');
      return;
    }

    logger.info(`Found ${executedMigrations.length} executed migration(s)`);

    // Determine how many to rollback
    let rollbackCount;
    if (steps === 'all') {
      rollbackCount = executedMigrations.length;
    } else {
      rollbackCount = Math.min(steps, executedMigrations.length);
    }

    logger.info(`Will rollback ${rollbackCount} migration(s):`);
    executedMigrations
      .slice(-rollbackCount)
      .reverse()
      .forEach((migration, index) => {
        logger.info(`  ${index + 1}. ${migration.name}`);
      });

    // Confirm rollback
    if (process.env.NODE_ENV === 'production') {
      logger.error('❌ Rollback in production requires manual confirmation');
      logger.error('Set CONFIRM_ROLLBACK=yes to proceed');
      if (process.env.CONFIRM_ROLLBACK !== 'yes') {
        throw new Error('Rollback cancelled - production safety check');
      }
    }

    // Perform rollback
    logger.info('⏳ Rolling back migrations...');
    
    for (let i = 0; i < rollbackCount; i++) {
      await umzug.down();
    }

    logger.info('✅ Migration rollback completed successfully');
    
    // Show remaining migrations
    const remainingMigrations = await umzug.executed();
    if (remainingMigrations.length > 0) {
      logger.info(`\nRemaining migrations (${remainingMigrations.length}):`);
      remainingMigrations.forEach((migration, index) => {
        logger.info(`  ${index + 1}. ${migration.name}`);
      });
    } else {
      logger.info('\n✓ All migrations rolled back');
    }

  } catch (error) {
    logger.error('❌ Migration rollback failed:', error);
    throw error;
  } finally {
    await sequelize.close();
    logger.info('Database connection closed');
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const steps = args[0] === 'all' ? 'all' : parseInt(args[0]) || 1;

// Run rollback
rollbackMigrations(steps)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Rollback failed:', error);
    process.exit(1);
  });
