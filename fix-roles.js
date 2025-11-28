const { User } = require('./src/database/models');

const fixRoles = async () => {
  try {
    console.log('Fixing user roles...');
    
    // Update existing users with correct roles
    const adminUpdated = await User.update(
      { role: 'admin' },
      { where: { email: 'admin@finan.com' } }
    );
    console.log(`✓ Updated admin user (${adminUpdated[0]} rows)`);
    
    const managerUpdated = await User.update(
      { role: 'manager' },
      { where: { email: 'manager@finan.com' } }
    );
    console.log(`✓ Updated manager user (${managerUpdated[0]} rows)`);
    
    const userUpdated = await User.update(
      { role: 'user' },
      { where: { email: 'user@finan.com' } }
    );
    console.log(`✓ Updated regular user (${userUpdated[0]} rows)`);
    
    // Verify
    const users = await User.findAll({ 
      attributes: ['email', 'firstName', 'lastName', 'role', 'isActive'],
      order: [['email', 'ASC']]
    });
    
    console.log('\nCurrent users:');
    users.forEach(u => {
      console.log(`  ${u.email}: role=${u.role}, name=${u.firstName} ${u.lastName}, active=${u.isActive}`);
    });
    
    console.log('\n✓ User roles fixed successfully!');
    console.log('\n⚠️  IMPORTANT: Logout and login again to get a new token with the correct role!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to fix roles:', error);
    process.exit(1);
  }
};

fixRoles();
