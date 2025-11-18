const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');
const auditLogger = require('../../middleware/auditLogger');

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, authorize('admin', 'manager'), auditLogger('CREATE', 'Receipt'), controller.create);
router.put('/:id', authenticate, authorize('admin', 'manager'), auditLogger('UPDATE', 'Receipt'), controller.update);
router.delete('/:id', authenticate, authorize('admin'), auditLogger('DELETE', 'Receipt'), controller.remove);

module.exports = router;
