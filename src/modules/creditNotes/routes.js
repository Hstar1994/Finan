const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const {
  validateCreateCreditNote,
  validateUpdateCreditNote,
  validateAppplyCreditNote
} = require('../../validators/creditNote.validator');

// Get all credit notes
router.get('/', authenticate, controller.getAll);

// Get credit note by ID
router.get('/:id', authenticate, controller.getById);

// Create credit note
router.post(
  '/',
  authenticate,
  authorize('admin', 'manager'),
  validateCreateCreditNote,
  auditLogger('CREATE', 'CreditNote'),
  controller.create
);

// Update credit note (status, reason, notes)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'manager'),
  validateUpdateCreditNote,
  auditLogger('UPDATE', 'CreditNote'),
  controller.update
);

// Apply credit note to invoice
router.post(
  '/:id/apply',
  authenticate,
  authorize('admin', 'manager'),
  validateAppplyCreditNote,
  auditLogger('UPDATE', 'CreditNote'),
  controller.applyCreditToInvoice
);

// Delete credit note
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  auditLogger('DELETE', 'CreditNote'),
  controller.remove
);

module.exports = router;
