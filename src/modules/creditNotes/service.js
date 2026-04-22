const { CreditNote, CreditNoteItem, Customer, Invoice, InvoiceItem, Item, sequelize } = require('../../database/models');
const logger = require('../../utils/logger');

/**
 * Generate next credit note number
 */
const generateCreditNoteNumber = async () => {
  try {
    const count = await CreditNote.count();
    return `CN-${String(count + 1).padStart(6, '0')}`;
  } catch (error) {
    logger.error('Failed to generate credit note number', { error: error.message });
    throw error;
  }
};

/**
 * Create a new credit note with items
 */
const createCreditNote = async (customerId, invoiceId, items, reason, notes, userId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validate customer exists
    const customer = await Customer.findByPk(customerId, { transaction });
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }

    // Validate invoice if provided
    if (invoiceId) {
      const invoice = await Invoice.findByPk(invoiceId, { transaction });
      if (!invoice) {
        throw new Error(`Invoice with ID ${invoiceId} not found`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      const tax = amount * (parseFloat(item.taxRate || 0) / 100);
      subtotal += amount;
      taxAmount += tax;
    });

    const totalAmount = subtotal + taxAmount;
    const creditNoteNumber = await generateCreditNoteNumber();

    // Create credit note
    const creditNote = await CreditNote.create({
      creditNoteNumber,
      customerId,
      invoiceId,
      issueDate: new Date(),
      subtotal,
      taxAmount,
      totalAmount,
      reason,
      notes,
      status: 'draft',
      createdBy: userId
    }, { transaction });

    // Create credit note items
    const creditNoteItems = await Promise.all(
      items.map(item =>
        CreditNoteItem.create({
          creditNoteId: creditNote.id,
          itemId: item.itemId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          amount: parseFloat(item.quantity) * parseFloat(item.unitPrice)
        }, { transaction })
      )
    );

    await transaction.commit();

    logger.info('Credit note created successfully', {
      creditNoteId: creditNote.id,
      creditNoteNumber,
      customerId,
      totalAmount
    });

    return {
      ...creditNote.toJSON(),
      items: creditNoteItems
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to create credit note', { error: error.message, customerId });
    throw error;
  }
};

/**
 * Apply credit note to invoice
 * Reduces invoice balance and updates status if fully paid
 */
const applyCreditNote = async (creditNoteId, invoiceId) => {
  const transaction = await sequelize.transaction();

  try {
    // Get credit note with full details
    const creditNote = await CreditNote.findByPk(creditNoteId, {
      include: [{ model: CreditNoteItem, as: 'items' }],
      transaction
    });

    if (!creditNote) {
      throw new Error(`Credit note with ID ${creditNoteId} not found`);
    }

    // Get invoice
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [{ model: InvoiceItem, as: 'items' }],
      transaction
    });

    if (!invoice) {
      throw new Error(`Invoice with ID ${invoiceId} not found`);
    }

    // Verify credit note belongs to same customer
    if (creditNote.customerId !== invoice.customerId) {
      throw new Error('Credit note and invoice must belong to the same customer');
    }

    // Verify credit note is in correct status
    if (creditNote.status !== 'issued') {
      throw new Error(`Credit note status must be 'issued' to apply. Current status: ${creditNote.status}`);
    }

    // Calculate new balance
    const newAmountPaid = Math.min(
      parseFloat(invoice.amountPaid) + parseFloat(creditNote.totalAmount),
      parseFloat(invoice.totalAmount)
    );

    const balanceDue = parseFloat(invoice.totalAmount) - newAmountPaid;

    // Determine new status
    let newStatus = invoice.status;
    if (balanceDue === 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    // Update invoice
    await invoice.update({
      amountPaid: newAmountPaid,
      status: newStatus
    }, { transaction });

    // Update credit note status
    await creditNote.update({
      status: 'applied',
      invoiceId: invoiceId
    }, { transaction });

    await transaction.commit();

    logger.info('Credit note applied successfully', {
      creditNoteId,
      invoiceId,
      appliedAmount: creditNote.totalAmount,
      newInvoiceStatus: newStatus
    });

    return {
      creditNote: creditNote.toJSON(),
      invoice: invoice.toJSON()
    };
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to apply credit note', { error: error.message, creditNoteId, invoiceId });
    throw error;
  }
};

/**
 * Get all credit notes with pagination and filtering
 */
const getAllCreditNotes = async (page = 1, limit = 10, filters = {}) => {
  try {
    const offset = (page - 1) * limit;
    const where = {};

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;

    const { count, rows } = await CreditNote.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: CreditNoteItem, as: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });

    return {
      crediteNotes: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to fetch credit notes', { error: error.message });
    throw error;
  }
};

/**
 * Get credit note by ID with all details
 */
const getCreditNoteById = async (creditNoteId) => {
  try {
    const creditNote = await CreditNote.findByPk(creditNoteId, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' },
        {
          model: CreditNoteItem,
          as: 'items',
          include: [{ model: Item, as: 'item' }]
        }
      ]
    });

    if (!creditNote) {
      throw new Error(`Credit note with ID ${creditNoteId} not found`);
    }

    return creditNote;
  } catch (error) {
    logger.error('Failed to fetch credit note', { error: error.message, creditNoteId });
    throw error;
  }
};

/**
 * Update credit note (status, reason, notes)
 */
const updateCreditNote = async (creditNoteId, updateData) => {
  try {
    const creditNote = await CreditNote.findByPk(creditNoteId);

    if (!creditNote) {
      throw new Error(`Credit note with ID ${creditNoteId} not found`);
    }

    // Only allow updating certain fields
    const allowedFields = ['status', 'reason', 'notes'];
    const filteredData = {};

    allowedFields.forEach(field => {
      if (field in updateData) {
        filteredData[field] = updateData[field];
      }
    });

    await creditNote.update(filteredData);

    logger.info('Credit note updated successfully', {
      creditNoteId,
      updatedFields: Object.keys(filteredData)
    });

    return creditNote;
  } catch (error) {
    logger.error('Failed to update credit note', { error: error.message, creditNoteId });
    throw error;
  }
};

/**
 * Delete credit note (only if draft status)
 */
const deleteCreditNote = async (creditNoteId) => {
  const transaction = await sequelize.transaction();

  try {
    const creditNote = await CreditNote.findByPk(creditNoteId, { transaction });

    if (!creditNote) {
      throw new Error(`Credit note with ID ${creditNoteId} not found`);
    }

    // Only allow deleting draft credit notes
    if (creditNote.status !== 'draft') {
      throw new Error(`Cannot delete credit note with status '${creditNote.status}'. Only draft credit notes can be deleted.`);
    }

    // Delete associated items
    await CreditNoteItem.destroy({
      where: { creditNoteId },
      transaction
    });

    // Delete credit note
    await creditNote.destroy({ transaction });

    await transaction.commit();

    logger.info('Credit note deleted successfully', { creditNoteId });

    return { message: 'Credit note deleted successfully' };
  } catch (error) {
    await transaction.rollback();
    logger.error('Failed to delete credit note', { error: error.message, creditNoteId });
    throw error;
  }
};

module.exports = {
  generateCreditNoteNumber,
  createCreditNote,
  applyCreditNote,
  getAllCreditNotes,
  getCreditNoteById,
  updateCreditNote,
  deleteCreditNote
};
