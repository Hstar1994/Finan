const { sequelize } = require('../database/connection');
const { QueryTypes } = require('sequelize');
const logger = require('./logger');

/**
 * Generate next invoice number using PostgreSQL sequence
 * This prevents race conditions in concurrent environments
 * @param {Transaction} transaction - Sequelize transaction object (optional)
 * @returns {Promise<string>} - Invoice number in format INV-000001
 */
const generateInvoiceNumber = async (transaction = null) => {
  try {
    const result = await sequelize.query(
      "SELECT nextval('invoice_number_seq') as num",
      { 
        type: QueryTypes.SELECT,
        transaction,
      }
    );
    
    const num = result[0].num;
    return `INV-${String(num).padStart(6, '0')}`;
  } catch (error) {
    // If sequence doesn't exist, fall back to count-based (shouldn't happen if init-sequences ran)
    logger.error('Invoice number sequence not found, falling back to count-based generation', { 
      error: error.message 
    });
    const { Invoice } = require('../database/models');
    const count = await Invoice.count({ transaction });
    return `INV-${String(count + 1).padStart(6, '0')}`;
  }
};

/**
 * Generate next receipt number using PostgreSQL sequence
 * This prevents race conditions in concurrent environments
 * @param {Transaction} transaction - Sequelize transaction object (optional)
 * @returns {Promise<string>} - Receipt number in format REC-000001
 */
const generateReceiptNumber = async (transaction = null) => {
  try {
    const result = await sequelize.query(
      "SELECT nextval('receipt_number_seq') as num",
      { 
        type: QueryTypes.SELECT,
        transaction,
      }
    );
    
    const num = result[0].num;
    return `REC-${String(num).padStart(6, '0')}`;
  } catch (error) {
    // If sequence doesn't exist, fall back to count-based (shouldn't happen if init-sequences ran)
    logger.error('Receipt number sequence not found, falling back to count-based generation', { 
      error: error.message 
    });
    const { Receipt } = require('../database/models');
    const count = await Receipt.count({ transaction });
    return `REC-${String(count + 1).padStart(6, '0')}`;
  }
};

module.exports = {
  generateInvoiceNumber,
  generateReceiptNumber,
};
