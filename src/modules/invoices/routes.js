const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const { validateCreateInvoice, validateUpdateInvoice } = require('../../validators/invoice.validator');

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateInvoice, auditLogger('CREATE', 'Invoice'), controller.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), validateUpdateInvoice, auditLogger('UPDATE', 'Invoice'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), auditLogger('DELETE', 'Invoice'), controller.remove);

module.exports = router;
