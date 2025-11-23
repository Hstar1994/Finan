const express = require('express');
const router = express.Router();

// Import module routes
const authRoutes = require('../modules/auth/routes');
const userRoutes = require('../modules/users/routes');
const customerRoutes = require('../modules/customers/routes');
const itemRoutes = require('../modules/items/routes');
const invoiceRoutes = require('../modules/invoices/routes');
const quoteRoutes = require('../modules/quotes/routes');
const receiptRoutes = require('../modules/receipts/routes');
const creditNoteRoutes = require('../modules/creditNotes/routes');
const auditRoutes = require('../modules/audit/routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Register routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/items', itemRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/quotes', quoteRoutes);
router.use('/receipts', receiptRoutes);
router.use('/credit-notes', creditNoteRoutes);
router.use('/audit', auditRoutes);

module.exports = router;
