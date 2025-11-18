const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const QuoteItem = sequelize.define('QuoteItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  quoteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Quotes',
      key: 'id'
    }
  },
  itemId: {
    type: DataTypes.UUID,
    references: {
      model: 'Items',
      key: 'id'
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unitPrice: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  }
}, {
  timestamps: true
});

module.exports = QuoteItem;
