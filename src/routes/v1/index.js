const express = require('express');
const router = express.Router();

// Import module routes
const authRoutes = require('../../modules/auth/routes');
const auditRoutes = require('../../modules/audit/routes');
const creditNoteRoutes = require('../../modules/creditNotes/routes');
const customerRoutes = require('../../modules/customers/routes');
const invoiceRoutes = require('../../modules/invoices/routes');
const itemRoutes = require('../../modules/items/routes');
const quoteRoutes = require('../../modules/quotes/routes');
const receiptRoutes = require('../../modules/receipts/routes');
const userRoutes = require('../../modules/users/routes');

// Register v1 routes
router.use('/auth', authRoutes);
router.use('/audit', auditRoutes);
router.use('/credit-notes', creditNoteRoutes);
router.use('/customers', customerRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/items', itemRoutes);
router.use('/quotes', quoteRoutes);
router.use('/receipts', receiptRoutes);
router.use('/users', userRoutes);

module.exports = router;
