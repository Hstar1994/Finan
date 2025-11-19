const { CreditNote, CreditNoteItem, Customer, Invoice, Item } = require('../../database/models');

const generateCreditNoteNumber = async () => {
  const count = await CreditNote.count();
  return `CN-${String(count + 1).padStart(6, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    
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
    
    res.json({
      creditNotes: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const creditNote = await CreditNote.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' },
        { model: CreditNoteItem, as: 'items', include: [{ model: Item, as: 'item' }] }
      ]
    });
    
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    
    res.json({ creditNote });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { customerId, invoiceId, items, reason, notes } = req.body;
    
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer and items are required' });
    }
    
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
      createdBy: req.user.id
    });
    
    const creditNoteItems = await Promise.all(
      items.map(item => 
        CreditNoteItem.create({
          creditNoteId: creditNote.id,
          itemId: item.itemId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate || 0,
          amount: parseFloat(item.quantity) * parseFloat(item.unitPrice)
        })
      )
    );
    
    res.status(201).json({ 
      message: 'Credit note created successfully', 
      creditNote: {
        ...creditNote.toJSON(),
        items: creditNoteItems
      }
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const creditNote = await CreditNote.findByPk(req.params.id);
    
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    
    await creditNote.update(req.body);
    res.json({ message: 'Credit note updated successfully', creditNote });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const creditNote = await CreditNote.findByPk(req.params.id);
    
    if (!creditNote) {
      return res.status(404).json({ error: 'Credit note not found' });
    }
    
    await creditNote.destroy();
    res.json({ message: 'Credit note deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
