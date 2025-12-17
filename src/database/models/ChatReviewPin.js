const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ChatReviewPin = sequelize.define('ChatReviewPin', {
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
  sourceMessageId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatMessages',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
    comment: 'The message where the mention was detected'
  },
  matchedEntityType: {
    type: DataTypes.ENUM('CUSTOMER', 'USER'),
    allowNull: false
  },
  matchedEntityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'RESOLVED'),
    allowNull: false,
    defaultValue: 'OPEN'
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
    comment: 'User who created the pin (can be null for system-generated)'
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedByUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  }
}, {
  timestamps: true,
  tableName: 'ChatReviewPins',
  indexes: [
    {
      fields: ['conversationId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['matchedEntityType', 'matchedEntityId']
    },
    {
      fields: ['sourceMessageId']
    },
    {
      fields: ['createdByUserId']
    }
  ]
});

// Instance methods

/**
 * Check if pin is open
 * @returns {boolean}
 */
ChatReviewPin.prototype.isOpen = function() {
  return this.status === 'OPEN';
};

/**
 * Check if pin is resolved
 * @returns {boolean}
 */
ChatReviewPin.prototype.isResolved = function() {
  return this.status === 'RESOLVED';
};

/**
 * Resolve the pin
 * @param {string} userId - ID of user resolving the pin
 */
ChatReviewPin.prototype.resolve = async function(userId) {
  this.status = 'RESOLVED';
  this.resolvedAt = new Date();
  this.resolvedByUserId = userId;
  await this.save();
};

/**
 * Reopen the pin
 */
ChatReviewPin.prototype.reopen = async function() {
  this.status = 'OPEN';
  this.resolvedAt = null;
  this.resolvedByUserId = null;
  await this.save();
};

/**
 * Check if pin references a customer
 * @returns {boolean}
 */
ChatReviewPin.prototype.isCustomerPin = function() {
  return this.matchedEntityType === 'CUSTOMER';
};

/**
 * Check if pin references a user
 * @returns {boolean}
 */
ChatReviewPin.prototype.isUserPin = function() {
  return this.matchedEntityType === 'USER';
};

module.exports = ChatReviewPin;
