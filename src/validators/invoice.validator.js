const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateInvoice = [
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isUUID()
    .withMessage('Customer ID must be a valid UUID'),
  
  commonValidations.date('dueDate'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required')
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
  
  commonValidations.string('notes', 0, 1000, true),
  commonValidations.string('terms', 0, 1000, true),
  
  handleValidationErrors,
];

const validateUpdateInvoice = [
  commonValidations.uuid('id'),
  
  body('customerId')
    .optional()
    .isUUID()
    .withMessage('Customer ID must be a valid UUID'),
  
  commonValidations.date('dueDate', true),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required if items are provided'),
  
  body('items.*.itemId')
    .optional()
    .isUUID()
    .withMessage('Item ID must be a valid UUID'),
  
  body('items.*.quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  
  body('items.*.unitPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number'),
  
  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('status')
    .optional()
    .isIn(['draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled'])
    .withMessage('Invalid status'),
  
  commonValidations.string('notes', 0, 1000, true),
  commonValidations.string('terms', 0, 1000, true),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateInvoice,
  validateUpdateInvoice,
};
