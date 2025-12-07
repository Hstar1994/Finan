const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  city: {
    type: DataTypes.STRING
  },
  state: {
    type: DataTypes.STRING
  },
  country: {
    type: DataTypes.STRING
  },
  zipCode: {
    type: DataTypes.STRING
  },
  taxId: {
    type: DataTypes.STRING
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Balance cannot be negative'
      },
      isDecimal: true
    }
  },
  creditLimit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00,
    validate: {
      min: {
        args: [0],
        msg: 'Credit limit cannot be negative'
      },
      isDecimal: true
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

// Instance methods

/**
 * Check if customer can make a purchase (balance + amount <= creditLimit)
 * @param {number} amount - Amount to be charged
 * @returns {boolean}
 */
Customer.prototype.canPurchase = function(amount) {
  const newBalance = parseFloat(this.balance) + parseFloat(amount);
  return newBalance <= parseFloat(this.creditLimit);
};

/**
 * Get remaining credit available
 * @returns {number}
 */
Customer.prototype.getAvailableCredit = function() {
  return Math.max(0, parseFloat(this.creditLimit) - parseFloat(this.balance));
};

/**
 * Check if customer is over credit limit
 * @returns {boolean}
 */
Customer.prototype.isOverCreditLimit = function() {
  return parseFloat(this.balance) > parseFloat(this.creditLimit);
};

/**
 * Validate balance operation before save
 * Ensures balance doesn't go negative
 */
Customer.addHook('beforeSave', (customer, options) => {
  if (customer.balance < 0) {
    throw new Error('Customer balance cannot be negative');
  }
});

module.exports = Customer;
