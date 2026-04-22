const logger = require('../../utils/logger');
const ApiResponse = require('../../utils/apiResponse');
const creditNoteService = require('./service');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (customerId) filters.customerId = customerId;

    const result = await creditNoteService.getAllCreditNotes(
      parseInt(page),
      parseInt(limit),
      filters
    );

    ApiResponse.success(res, result, 'Credit notes fetched successfully');
  } catch (error) {
    logger.error('Error fetching credit notes', { error: error.message });
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const creditNote = await creditNoteService.getCreditNoteById(req.params.id);
    ApiResponse.success(res, { creditNote }, 'Credit note fetched successfully');
  } catch (error) {
    logger.error('Error fetching credit note', { error: error.message, creditNoteId: req.params.id });
    if (error.message.includes('not found')) {
      return ApiResponse.notFound(res, 'Credit note not found');
    }
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { customerId, invoiceId, items, reason, notes } = req.body;

    const creditNote = await creditNoteService.createCreditNote(
      customerId,
      invoiceId,
      items,
      reason,
      notes,
      req.user.id
    );

    ApiResponse.created(res, { creditNote }, 'Credit note created successfully');
  } catch (error) {
    logger.error('Error creating credit note', { error: error.message });
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const creditNote = await creditNoteService.updateCreditNote(req.params.id, req.body);
    ApiResponse.success(res, { creditNote }, 'Credit note updated successfully');
  } catch (error) {
    logger.error('Error updating credit note', { error: error.message, creditNoteId: req.params.id });
    if (error.message.includes('not found')) {
      return ApiResponse.notFound(res, 'Credit note not found');
    }
    next(error);
  }
};

const applyCreditToInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.body;
    
    const result = await creditNoteService.applyCreditNote(req.params.id, invoiceId);
    
    logger.info('Credit note applied to invoice', {
      creditNoteId: req.params.id,
      invoiceId
    });

    ApiResponse.success(res, result, 'Credit note applied to invoice successfully');
  } catch (error) {
    logger.error('Error applying credit note', { error: error.message, creditNoteId: req.params.id });
    if (error.message.includes('not found')) {
      return ApiResponse.notFound(res, error.message);
    }
    if (error.message.includes('status')) {
      return ApiResponse.error(res, error.message, null, 400);
    }
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const result = await creditNoteService.deleteCreditNote(req.params.id);
    ApiResponse.success(res, result, 'Credit note deleted successfully');
  } catch (error) {
    logger.error('Error deleting credit note', { error: error.message, creditNoteId: req.params.id });
    if (error.message.includes('not found')) {
      return ApiResponse.notFound(res, 'Credit note not found');
    }
    if (error.message.includes('Cannot delete')) {
      return ApiResponse.error(res, error.message, null, 400);
    }
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  applyCreditToInvoice,
  remove
};
