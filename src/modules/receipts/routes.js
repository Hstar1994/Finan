const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const { validateCreateReceipt, validateUpdateReceipt } = require('../../validators/receipt.validator');

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateReceipt, auditLogger('CREATE', 'Receipt'), controller.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), validateUpdateReceipt, auditLogger('UPDATE', 'Receipt'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), auditLogger('DELETE', 'Receipt'), controller.remove);

module.exports = router;
