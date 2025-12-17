const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const ChatReviewPinLink = sequelize.define('ChatReviewPinLink', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pinId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'ChatReviewPins',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  linkType: {
    type: DataTypes.ENUM('INVOICE', 'QUOTE', 'RECEIPT'),
    allowNull: false
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  addedByUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  }
}, {
  timestamps: true,
  updatedAt: false, // Only need createdAt
  tableName: 'ChatReviewPinLinks',
  indexes: [
    {
      fields: ['pinId']
    },
    {
      fields: ['linkType', 'documentId']
    },
    {
      unique: true,
      fields: ['pinId', 'linkType', 'documentId'],
      name: 'unique_pin_document_link'
    }
  ]
});

// Instance methods

/**
 * Get the model name for the linked document
 * @returns {string}
 */
ChatReviewPinLink.prototype.getDocumentModelName = function() {
  const modelMap = {
    'INVOICE': 'Invoice',
    'QUOTE': 'Quote',
    'RECEIPT': 'Receipt'
  };
  return modelMap[this.linkType];
};

/**
 * Check if link is for an invoice
 * @returns {boolean}
 */
ChatReviewPinLink.prototype.isInvoiceLink = function() {
  return this.linkType === 'INVOICE';
};

/**
 * Check if link is for a quote
 * @returns {boolean}
 */
ChatReviewPinLink.prototype.isQuoteLink = function() {
  return this.linkType === 'QUOTE';
};

/**
 * Check if link is for a receipt
 * @returns {boolean}
 */
ChatReviewPinLink.prototype.isReceiptLink = function() {
  return this.linkType === 'RECEIPT';
};

module.exports = ChatReviewPinLink;
