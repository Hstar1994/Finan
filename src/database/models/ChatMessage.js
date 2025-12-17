const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ChatMessage = sequelize.define('ChatMessage', {
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
  senderUserId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    comment: 'Staff user sender (null if customer or system)'
  },
  senderCustomerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Customers',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE',
    comment: 'Customer sender (null if staff or system)'
  },
  messageType: {
    type: DataTypes.ENUM('TEXT', 'SYSTEM', 'DOCUMENT', 'FILE'),
    allowNull: false,
    defaultValue: 'TEXT'
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Message text content (null for FILE type)'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional data: {documentType, documentId, fileName, fileUrl, fileSize, etc.}'
  },
  editedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When message was last edited (null if never edited)'
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp (null if not deleted)'
  }
}, {
  timestamps: true,
  updatedAt: false, // We use editedAt instead
  tableName: 'ChatMessages',
  indexes: [
    {
      fields: ['conversationId', 'createdAt']
    },
    {
      fields: ['senderUserId']
    },
    {
      fields: ['senderCustomerId']
    },
    {
      fields: ['messageType']
    },
    {
      fields: ['deletedAt']
    }
  ],
  validate: {
    // Ensure sender is either user OR customer OR null (system), not both
    validSender() {
      const hasUser = this.senderUserId !== null;
      const hasCustomer = this.senderCustomerId !== null;
      
      if (hasUser && hasCustomer) {
        throw new Error('Message cannot have both user and customer sender');
      }
    },
    // TEXT messages must have body
    textMessageHasBody() {
      if (this.messageType === 'TEXT' && (!this.body || this.body.trim().length === 0)) {
        throw new Error('TEXT messages must have a body');
      }
    },
    // DOCUMENT messages must have metadata
    documentMessageHasMetadata() {
      if (this.messageType === 'DOCUMENT' && !this.metadata) {
        throw new Error('DOCUMENT messages must have metadata');
      }
    }
  }
});

// Instance methods

/**
 * Check if message is from a staff user
 * @returns {boolean}
 */
ChatMessage.prototype.isFromStaff = function() {
  return this.senderUserId !== null;
};

/**
 * Check if message is from a customer
 * @returns {boolean}
 */
ChatMessage.prototype.isFromCustomer = function() {
  return this.senderCustomerId !== null;
};

/**
 * Check if message is a system message
 * @returns {boolean}
 */
ChatMessage.prototype.isSystem = function() {
  return this.messageType === 'SYSTEM';
};

/**
 * Check if message has been edited
 * @returns {boolean}
 */
ChatMessage.prototype.isEdited = function() {
  return this.editedAt !== null;
};

/**
 * Check if message has been deleted
 * @returns {boolean}
 */
ChatMessage.prototype.isDeleted = function() {
  return this.deletedAt !== null;
};

/**
 * Soft delete the message
 */
ChatMessage.prototype.softDelete = async function() {
  this.deletedAt = new Date();
  await this.save();
};

/**
 * Edit the message body
 * @param {string} newBody - New message text
 */
ChatMessage.prototype.edit = async function(newBody) {
  if (this.messageType !== 'TEXT') {
    throw new Error('Only TEXT messages can be edited');
  }
  if (this.isDeleted()) {
    throw new Error('Cannot edit deleted message');
  }
  
  this.body = newBody;
  this.editedAt = new Date();
  await this.save();
};

/**
 * Get sender ID (user or customer)
 * @returns {string|null}
 */
ChatMessage.prototype.getSenderId = function() {
  return this.senderUserId || this.senderCustomerId || null;
};

/**
 * Get sender type
 * @returns {'staff'|'customer'|'system'}
 */
ChatMessage.prototype.getSenderType = function() {
  if (this.senderUserId) return 'staff';
  if (this.senderCustomerId) return 'customer';
  return 'system';
};

module.exports = ChatMessage;
