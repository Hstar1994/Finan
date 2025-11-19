const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticate, authorize } = require('../../middleware/auth');

router.get('/', authenticate, authorize('admin', 'manager'), controller.getAll);
router.get('/:id', authenticate, authorize('admin', 'manager'), controller.getById);
router.get('/:entity/:entityId', authenticate, authorize('admin', 'manager'), controller.getByEntity);

module.exports = router;
