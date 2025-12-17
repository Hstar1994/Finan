const express = require('express');
const router = express.Router();
const controller = require('./controller');
const customerAuthController = require('../auth/customerAuth.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const { validateCreateCustomer, validateUpdateCustomer } = require('../../validators/customer.validator');

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Get all customers
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of customers
 */
router.get('/', authenticate, controller.getAll);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer by ID
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer details
 */
router.get('/:id', authenticate, controller.getById);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Customer created successfully
 */
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateCustomer, auditLogger('CREATE', 'Customer'), controller.create);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Update a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer updated successfully
 */
router.put('/:id', authenticate, authorize('admin', 'manager'), validateUpdateCustomer, auditLogger('UPDATE', 'Customer'), controller.update);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Delete a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer deleted successfully
 */
router.delete('/:id', authenticate, authorize('admin'), auditLogger('DELETE', 'Customer'), controller.remove);

/**
 * @swagger
 * /api/customers/{id}/balance:
 *   patch:
 *     summary: Update customer balance
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               operation:
 *                 type: string
 *                 enum: [add, subtract]
 *     responses:
 *       200:
 *         description: Balance updated successfully
 */
router.patch('/:id/balance', authenticate, authorize('admin', 'manager'), auditLogger('UPDATE', 'Customer'), controller.updateBalance);

/**
 * @swagger
 * /api/customers/{id}/enable-auth:
 *   post:
 *     summary: Enable customer authentication
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *         description: Customer authentication enabled
 */
router.post('/:customerId/enable-auth', authenticate, authorize('admin', 'manager'), auditLogger('UPDATE', 'Customer'), customerAuthController.enableAuth);

/**
 * @swagger
 * /api/customers/{id}/disable-auth:
 *   post:
 *     summary: Disable customer authentication
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer authentication disabled
 */
router.post('/:customerId/disable-auth', authenticate, authorize('admin', 'manager'), auditLogger('UPDATE', 'Customer'), customerAuthController.disableAuth);

module.exports = router;
