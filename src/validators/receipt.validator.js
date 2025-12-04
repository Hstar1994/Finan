const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateReceipt = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isUUID()
    .withMessage('Customer ID must be a valid UUID'),
  
  body('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  
  commonValidations.positiveNumber('amount'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other'])
    .withMessage('Invalid payment method'),
  
  commonValidations.string('reference', 0, 100, true),
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

const validateUpdateReceipt = [
  commonValidations.uuid('id'),
  
  body('customerId')
    .optional()
    .isUUID()
    .withMessage('Customer ID must be a valid UUID'),
  
  body('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  
  commonValidations.positiveNumber('amount', true),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'check', 'bank_transfer', 'credit_card', 'other'])
    .withMessage('Invalid payment method'),
  
  commonValidations.string('reference', 0, 100, true),
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateReceipt,
  validateUpdateReceipt,
};
