const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ChatConversation = sequelize.define('ChatConversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('CUSTOMER_DM', 'STAFF_GROUP', 'STAFF_DM'),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Optional title for group chats or staff DMs'
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Customers',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    comment: 'Required for CUSTOMER_DM, null for STAFF_GROUP and STAFF_DM'
  },
  createdByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    comment: 'Staff user who created this conversation'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of the last message, used for sorting conversations'
  }
}, {
  timestamps: true,
  tableName: 'ChatConversations',
  indexes: [
    {
      fields: ['type']
    },
    {
      fields: ['customerId']
    },
    {
      fields: ['lastMessageAt']
    },
    {
      fields: ['createdByUserId']
    }
  ],
  validate: {
    // Ensure CUSTOMER_DM has customerId
    customerDmRequiresCustomer() {
      if (this.type === 'CUSTOMER_DM' && !this.customerId) {
        throw new Error('CUSTOMER_DM conversations must have a customerId');
      }
    },
    // Ensure non-CUSTOMER_DM has no customerId
    nonCustomerDmNoCustomer() {
      if (this.type !== 'CUSTOMER_DM' && this.customerId) {
        throw new Error('Only CUSTOMER_DM conversations can have a customerId');
      }
    }
  }
});

// Instance methods

/**
 * Check if conversation is a customer direct message
 * @returns {boolean}
 */
ChatConversation.prototype.isCustomerDM = function() {
  return this.type === 'CUSTOMER_DM';
};

/**
 * Check if conversation is a staff group
 * @returns {boolean}
 */
ChatConversation.prototype.isStaffGroup = function() {
  return this.type === 'STAFF_GROUP';
};

/**
 * Check if conversation is a staff direct message
 * @returns {boolean}
 */
ChatConversation.prototype.isStaffDM = function() {
  return this.type === 'STAFF_DM';
};

/**
 * Update lastMessageAt timestamp
 */
ChatConversation.prototype.updateLastMessageAt = async function() {
  this.lastMessageAt = new Date();
  await this.save();
};

module.exports = ChatConversation;
