const { body } = require('express-validator');
const { handleValidationErrors, commonValidations } = require('./common');

const validateLogin = [
  commonValidations.email('email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const validateRegister = [
  commonValidations.string('username', 3, 50),
  commonValidations.email('email'),
  commonValidations.password('password'),
  commonValidations.string('fullName', 2, 100),
  body('role')
    .optional()
    .isIn(['admin', 'accountant', 'sales', 'viewer'])
    .withMessage('Role must be one of: admin, accountant, sales, viewer'),
  handleValidationErrors,
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  commonValidations.password('newPassword'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
  handleValidationErrors,
];

const validateResetPassword = [
  commonValidations.email('email'),
  body('resetToken')
    .notEmpty()
    .withMessage('Reset token is required'),
  commonValidations.password('newPassword'),
  handleValidationErrors,
];

module.exports = {
  validateLogin,
  validateRegister,
  validateChangePassword,
  validateResetPassword,
};
