const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 * Call this after validation chains
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Common validation chains
 */
const commonValidations = {
  uuid: (field) => param(field).isUUID().withMessage(`${field} must be a valid UUID`),
  
  pagination: () => [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  ],
  
  date: (field, optional = false) => {
    const validator = optional ? body(field).optional() : body(field);
    return validator.isISO8601().withMessage(`${field} must be a valid date`);
  },
  
  positiveNumber: (field, optional = false) => {
    const validator = optional ? body(field).optional() : body(field);
    return validator.isFloat({ min: 0.01 }).withMessage(`${field} must be a positive number`);
  },
  
  nonNegativeNumber: (field, optional = false) => {
    const validator = optional ? body(field).optional() : body(field);
    return validator.isFloat({ min: 0 }).withMessage(`${field} must be a non-negative number`);
  },
  
  string: (field, minLength = 1, maxLength = 255, optional = false) => {
    const validator = optional ? body(field).optional() : body(field);
    return validator
      .trim()
      .isLength({ min: minLength, max: maxLength })
      .withMessage(`${field} must be between ${minLength} and ${maxLength} characters`);
  },
  
  email: (field) => body(field)
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage(`${field} must be a valid email address`),
  
  password: (field) => body(field)
    .isLength({ min: 8 })
    .withMessage(`${field} must be at least 8 characters long`)
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(`${field} must contain at least one uppercase letter, one lowercase letter, and one number`),
};

module.exports = {
  handleValidationErrors,
  commonValidations,
};
