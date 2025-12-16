const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateItem = [
  commonValidations.string('name', 2, 100),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU must not exceed 50 characters'),
  
  commonValidations.string('description', 0, 1000, true),
  
  commonValidations.nonNegativeNumber('unitPrice'),
  
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors,
];

const validateUpdateItem = [
  commonValidations.uuid('id'),
  
  commonValidations.string('name', 2, 100, true),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('SKU must not exceed 50 characters'),
  
  commonValidations.string('description', 0, 1000, true),
  
  commonValidations.nonNegativeNumber('unitPrice', true),
  
  body('taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Category must not exceed 50 characters'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateItem,
  validateUpdateItem,
};
