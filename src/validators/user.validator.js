const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateCreateUser = [
  commonValidations.string('username', 3, 50),
  commonValidations.email('email'),
  commonValidations.password('password'),
  commonValidations.string('fullName', 2, 100),
  
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['admin', 'accountant', 'sales', 'viewer'])
    .withMessage('Role must be one of: admin, accountant, sales, viewer'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors,
];

const validateUpdateUser = [
  commonValidations.uuid('id'),
  
  commonValidations.string('username', 3, 50, true),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email must be a valid email address'),
  
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  commonValidations.string('fullName', 2, 100, true),
  
  body('role')
    .optional()
    .isIn(['admin', 'accountant', 'sales', 'viewer'])
    .withMessage('Role must be one of: admin, accountant, sales, viewer'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  
  handleValidationErrors,
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
};
