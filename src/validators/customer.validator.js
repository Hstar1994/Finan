const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateCustomer = [
  commonValidations.string('name', 2, 100),
  
  commonValidations.email('email'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Phone number contains invalid characters')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters'),
  
  commonValidations.string('address', 0, 500, true),
  
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID must not exceed 50 characters'),
  
  commonValidations.nonNegativeNumber('creditLimit', true),
  
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

const validateUpdateCustomer = [
  commonValidations.uuid('id'),
  
  commonValidations.string('name', 2, 100, true),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email must be a valid email address'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Phone number contains invalid characters')
    .isLength({ min: 7, max: 20 })
    .withMessage('Phone number must be between 7 and 20 characters'),
  
  commonValidations.string('address', 0, 500, true),
  
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID must not exceed 50 characters'),
  
  commonValidations.nonNegativeNumber('creditLimit', true),
  
  commonValidations.string('notes', 0, 1000, true),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateCustomer,
  validateUpdateCustomer,
};
