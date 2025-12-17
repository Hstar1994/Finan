const express = require('express');
const router = express.Router();
const controller = require('./controller');
const customerAuthController = require('./customerAuth.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { authenticateChatUser } = require('../../middleware/chatAuth');
const auditLogger = require('../../middleware/auditLogger');
const { loginLimiter, strictLimiter } = require('../../middleware/rateLimiter');
const { validateLogin, validateRegister, validateChangePassword } = require('../../validators/auth.validator');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, manager, admin]
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', authenticate, authorize('admin'), validateRegister, auditLogger('CREATE', 'User'), controller.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Validation error
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', loginLimiter, validateLogin, controller.login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', authenticate, controller.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', authenticate, auditLogger('UPDATE', 'User'), controller.updateProfile);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       429:
 *         description: Too many attempts
 */
router.post('/change-password', strictLimiter, authenticate, validateChangePassword, auditLogger('UPDATE', 'User'), controller.changePassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset user password (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - newPassword
 *             properties:
 *               userId:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       429:
 *         description: Too many attempts
 */
router.post('/reset-password', strictLimiter, authenticate, authorize('admin'), controller.resetUserPassword);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh authentication token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
router.post('/refresh', authenticate, controller.refreshToken);

// ========== Customer Authentication Routes ==========

/**
 * @swagger
 * /api/auth/customer/register:
 *   post:
 *     summary: Register a new customer with authentication
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - authEmail
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               authEmail:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer registered successfully
 */
router.post('/customer/register', customerAuthController.register);

/**
 * @swagger
 * /api/auth/customer/login:
 *   post:
 *     summary: Login as customer
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authEmail
 *               - password
 *             properties:
 *               authEmail:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/customer/login', loginLimiter, customerAuthController.login);

/**
 * @swagger
 * /api/auth/customer/profile:
 *   get:
 *     summary: Get customer profile
 *     tags: [Customer Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer profile
 */
router.get('/customer/profile', authenticateChatUser, customerAuthController.getProfile);

/**
 * @swagger
 * /api/auth/customer/change-password:
 *   post:
 *     summary: Change customer password
 *     tags: [Customer Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/customer/change-password', strictLimiter, authenticateChatUser, customerAuthController.changePassword);

/**
 * @swagger
 * /api/auth/customer/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authEmail
 *             properties:
 *               authEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent if email exists
 */
router.post('/customer/forgot-password', strictLimiter, customerAuthController.requestPasswordReset);

/**
 * @swagger
 * /api/auth/customer/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Customer Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authEmail
 *               - resetToken
 *               - newPassword
 *             properties:
 *               authEmail:
 *                 type: string
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/customer/reset-password', strictLimiter, customerAuthController.resetPassword);

module.exports = router;
