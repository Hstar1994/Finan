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
  },
  
  // Authentication fields (for customer login)
  authEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether customer login is enabled'
  },
  authEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    },
    comment: 'Email for customer authentication (separate from contact email)'
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Hashed password for customer login'
  },
  passwordUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When password was last updated'
  },
  failedLoginCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of consecutive failed login attempts'
  },
  lockedUntil: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Account locked until this timestamp (null if not locked)'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last successful login timestamp'
  },
  resetTokenHash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Hashed password reset token'
  },
  resetTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the password reset token expires'
  },
  authPhone: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'Phone number for customer authentication'
  },
  emailVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When email was verified'
  },
  phoneVerifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When phone was verified'
  }
}, {
  timestamps: true,
  paranoid: true,  // Enable soft delete (adds deletedAt column)
  indexes: [
    {
      fields: ['authEnabled']
    },
    {
      fields: ['authEmail'],
      where: {
        authEmail: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      fields: ['authPhone'],
      where: {
        authPhone: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    }
  ]
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
 * Check if customer account is locked
 * @returns {boolean}
 */
Customer.prototype.isLocked = function() {
  if (!this.lockedUntil) return false;
  return new Date() < new Date(this.lockedUntil);
};

/**
 * Check if customer can login
 * @returns {boolean}
 */
Customer.prototype.canLogin = function() {
  return this.authEnabled && 
         this.passwordHash !== null && 
         !this.isLocked();
};

/**
 * Increment failed login count and lock if necessary
 */
Customer.prototype.recordFailedLogin = async function() {
  this.failedLoginCount += 1;
  
  // Lock account for 30 minutes after 5 failed attempts
  if (this.failedLoginCount >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  }
  
  await this.save();
};

/**
 * Reset failed login count on successful login
 */
Customer.prototype.recordSuccessfulLogin = async function() {
  this.failedLoginCount = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
  await this.save();
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
