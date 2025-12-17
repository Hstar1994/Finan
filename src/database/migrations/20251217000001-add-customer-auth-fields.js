const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Adding customer authentication fields...');
      
      // Add authentication fields to Customers table
      await queryInterface.addColumn('Customers', 'authEnabled', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'authEmail', {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'passwordHash', {
        type: DataTypes.STRING(255),
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'passwordUpdatedAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'failedLoginCount', {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'lockedUntil', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'lastLoginAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'resetTokenHash', {
        type: DataTypes.STRING(255),
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'resetTokenExpiresAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      // Optional but useful fields
      await queryInterface.addColumn('Customers', 'authPhone', {
        type: DataTypes.STRING(32),
        allowNull: true,
        unique: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'emailVerifiedAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      await queryInterface.addColumn('Customers', 'phoneVerifiedAt', {
        type: DataTypes.DATE,
        allowNull: true
      }, { transaction });
      
      // Create indexes
      await queryInterface.addIndex('Customers', ['authEnabled'], {
        name: 'idx_customers_auth_enabled',
        transaction
      });
      
      await queryInterface.addIndex('Customers', ['authEmail'], {
        name: 'idx_customers_auth_email',
        where: {
          authEmail: {
            [Sequelize.Op.ne]: null
          }
        },
        transaction
      });
      
      await queryInterface.addIndex('Customers', ['authPhone'], {
        name: 'idx_customers_auth_phone',
        where: {
          authPhone: {
            [Sequelize.Op.ne]: null
          }
        },
        transaction
      });
      
      await transaction.commit();
      console.log('✓ Customer authentication fields added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Failed to add customer authentication fields:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('Removing customer authentication fields...');
      
      // Remove indexes
      await queryInterface.removeIndex('Customers', 'idx_customers_auth_phone', { transaction });
      await queryInterface.removeIndex('Customers', 'idx_customers_auth_email', { transaction });
      await queryInterface.removeIndex('Customers', 'idx_customers_auth_enabled', { transaction });
      
      // Remove columns
      await queryInterface.removeColumn('Customers', 'phoneVerifiedAt', { transaction });
      await queryInterface.removeColumn('Customers', 'emailVerifiedAt', { transaction });
      await queryInterface.removeColumn('Customers', 'authPhone', { transaction });
      await queryInterface.removeColumn('Customers', 'resetTokenExpiresAt', { transaction });
      await queryInterface.removeColumn('Customers', 'resetTokenHash', { transaction });
      await queryInterface.removeColumn('Customers', 'lastLoginAt', { transaction });
      await queryInterface.removeColumn('Customers', 'lockedUntil', { transaction });
      await queryInterface.removeColumn('Customers', 'failedLoginCount', { transaction });
      await queryInterface.removeColumn('Customers', 'passwordUpdatedAt', { transaction });
      await queryInterface.removeColumn('Customers', 'passwordHash', { transaction });
      await queryInterface.removeColumn('Customers', 'authEmail', { transaction });
      await queryInterface.removeColumn('Customers', 'authEnabled', { transaction });
      
      await transaction.commit();
      console.log('✓ Customer authentication fields removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('✗ Failed to remove customer authentication fields:', error);
      throw error;
    }
  }
};
