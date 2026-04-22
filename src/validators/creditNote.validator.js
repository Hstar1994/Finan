const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateCreditNote = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isUUID()
    .withMessage('Customer ID must be a valid UUID'),
  
  body('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.itemId')
    .optional()
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  
  body('items.*.quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  
  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('items.*.description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

const validateUpdateCreditNote = [
  commonValidations.uuid('id'),
  
  body('status')
    .optional()
    .isIn(['draft', 'issued', 'applied'])
    .withMessage('Invalid status. Must be one of: draft, issued, applied'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

const validateAppplyCreditNote = [
  commonValidations.uuid('id'),
  
  body('invoiceId')
    .notEmpty()
    .withMessage('Invoice ID is required')
    .isUUID()
    .withMessage('Invoice ID must be a valid UUID'),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateCreditNote,
  validateUpdateCreditNote,
  validateAppplyCreditNote,
};
