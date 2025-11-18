const { Receipt, Customer, Invoice } = require('../../database/models');

const generateReceiptNumber = async () => {
  const count = await Receipt.count();
  return `REC-${String(count + 1).padStart(6, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, customerId } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (customerId) where.customerId = customerId;
    
    const { count, rows } = await Receipt.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: Invoice, as: 'invoice', attributes: ['id', 'invoiceNumber'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      receipts: rows,
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
    const receipt = await Receipt.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: Invoice, as: 'invoice' }
      ]
    });
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    res.json({ receipt });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { customerId, invoiceId, amount, paymentMethod, reference, notes } = req.body;
    
    if (!customerId || !amount) {
      return res.status(400).json({ error: 'Customer and amount are required' });
    }
    
    const receiptNumber = await generateReceiptNumber();
    
    const receipt = await Receipt.create({
      receiptNumber,
      customerId,
      invoiceId,
      paymentDate: new Date(),
      amount,
      paymentMethod: paymentMethod || 'cash',
      reference,
      notes,
      createdBy: req.user.id
    });
    
    // Update invoice if linked
    if (invoiceId) {
      const invoice = await Invoice.findByPk(invoiceId);
      if (invoice) {
        invoice.amountPaid = parseFloat(invoice.amountPaid) + parseFloat(amount);
        
        if (invoice.amountPaid >= invoice.totalAmount) {
          invoice.status = 'paid';
        } else if (invoice.amountPaid > 0) {
          invoice.status = 'partial';
        }
        
        await invoice.save();
      }
    }
    
    res.status(201).json({ message: 'Receipt created successfully', receipt });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    await receipt.update(req.body);
    res.json({ message: 'Receipt updated successfully', receipt });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const receipt = await Receipt.findByPk(req.params.id);
    
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    await receipt.destroy();
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
