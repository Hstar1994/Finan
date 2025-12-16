const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');
const { validateCreateItem, validateUpdateItem } = require('../../validators/item.validator');

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('admin', 'manager'), validateCreateItem, auditLogger('CREATE', 'Item'), controller.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), validateUpdateItem, auditLogger('UPDATE', 'Item'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), auditLogger('DELETE', 'Item'), controller.remove);

module.exports = router;
