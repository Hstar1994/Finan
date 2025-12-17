const { sequelize } = require('./models');
const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const migrate = async () => {
  try {
    console.log('Starting database migration...');
    
    // Run manual migrations first (for altering existing tables)
    const migrationsPath = path.join(__dirname, 'migrations');
    
    if (fs.existsSync(migrationsPath)) {
      console.log('Running manual migrations...');
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort();
      
      for (const file of migrationFiles) {
        try {
          console.log(`  Running migration: ${file}`);
          const migration = require(path.join(migrationsPath, file));
          await migration.up(sequelize.getQueryInterface(), Sequelize);
        } catch (error) {
          // If migration already ran or column exists, skip
          if (error.message.includes('already exists') || 
              error.message.includes('column') ||
              error.message.includes('duplicate')) {
            console.log(`  ⚠ Migration ${file} already applied, skipping...`);
            continue;
          }
          throw error;
        }
      }
      console.log('✓ Manual migrations completed');
    }
    
    // Sync all models with database (creates new tables)
    console.log('Syncing models with database...');
    await sequelize.sync({ alter: true });
    
    console.log('✓ Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
