const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ChatParticipant = sequelize.define('ChatParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatConversations',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    comment: 'Staff user participant (null if customer)'
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
    comment: 'Customer participant (null if staff)'
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When participant left the conversation (null if still active)'
  },
  lastReadMessageId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'ChatMessages',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    comment: 'Last message this participant has read'
  }
}, {
  timestamps: true,
  tableName: 'ChatParticipants',
  indexes: [
    {
      fields: ['conversationId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['customerId']
    },
    {
      unique: true,
      fields: ['conversationId', 'userId'],
      name: 'unique_conversation_user',
      where: {
        userId: {
          [sequelize.Sequelize.Op.ne]: null
        },
        leftAt: null
      }
    },
    {
      unique: true,
      fields: ['conversationId', 'customerId'],
      name: 'unique_conversation_customer',
      where: {
        customerId: {
          [sequelize.Sequelize.Op.ne]: null
        },
        leftAt: null
      }
    }
  ],
  validate: {
    // Ensure participant is either user OR customer, not both or neither
    exactlyOneParticipantType() {
      const hasUser = this.userId !== null;
      const hasCustomer = this.customerId !== null;
      
      if (hasUser && hasCustomer) {
        throw new Error('Participant cannot be both user and customer');
      }
      if (!hasUser && !hasCustomer) {
        throw new Error('Participant must be either user or customer');
      }
    }
  }
});

// Instance methods

/**
 * Check if participant is a staff user
 * @returns {boolean}
 */
ChatParticipant.prototype.isStaff = function() {
  return this.userId !== null;
};

/**
 * Check if participant is a customer
 * @returns {boolean}
 */
ChatParticipant.prototype.isCustomer = function() {
  return this.customerId !== null;
};

/**
 * Check if participant is still active in conversation
 * @returns {boolean}
 */
ChatParticipant.prototype.isActive = function() {
  return this.leftAt === null;
};

/**
 * Mark participant as having left the conversation
 */
ChatParticipant.prototype.leave = async function() {
  this.leftAt = new Date();
  await this.save();
};

/**
 * Update last read message
 * @param {string} messageId - UUID of the last read message
 */
ChatParticipant.prototype.markRead = async function(messageId) {
  this.lastReadMessageId = messageId;
  await this.save();
};

module.exports = ChatParticipant;
