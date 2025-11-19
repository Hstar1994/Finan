const { User } = require('./models');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Check if admin user exists
    const existingAdmin = await User.findOne({ where: { email: 'admin@finan.com' } });
    
    if (!existingAdmin) {
      // Create default admin user
      await User.create({
        email: 'admin@finan.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin'
      });
      console.log('✓ Admin user created (email: admin@finan.com, password: admin123)');
    } else {
      console.log('✓ Admin user already exists');
    }
    
    // Check if manager user exists
    const existingManager = await User.findOne({ where: { email: 'manager@finan.com' } });
    
    if (!existingManager) {
      // Create default manager user
      await User.create({
        email: 'manager@finan.com',
        password: 'manager123',
        firstName: 'Manager',
        lastName: 'User',
        role: 'manager'
      });
      console.log('✓ Manager user created (email: manager@finan.com, password: manager123)');
    } else {
      console.log('✓ Manager user already exists');
    }
    
    // Check if regular user exists
    const existingUser = await User.findOne({ where: { email: 'user@finan.com' } });
    
    if (!existingUser) {
      // Create default regular user
      await User.create({
        email: 'user@finan.com',
        password: 'user123',
        firstName: 'Regular',
        lastName: 'User',
        role: 'user'
      });
      console.log('✓ Regular user created (email: user@finan.com, password: user123)');
    } else {
      console.log('✓ Regular user already exists');
    }
    
    console.log('✓ Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding failed:', error);
    process.exit(1);
  }
};

seed();
