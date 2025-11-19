const { Invoice, InvoiceItem, Customer, Item } = require('../../database/models');
const { Op } = require('sequelize');

const generateInvoiceNumber = async () => {
  const count = await Invoice.count();
  return `INV-${String(count + 1).padStart(6, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (customerId) {
      where.customerId = customerId;
    }
    
    const { count, rows } = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: InvoiceItem, as: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      invoices: rows,
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
    const invoice = await Invoice.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: InvoiceItem, as: 'items', include: [{ model: Item, as: 'item' }] }
      ]
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ invoice });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { customerId, dueDate, items, notes, terms } = req.body;
    
    if (!customerId || !dueDate || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer, due date, and items are required' });
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
    
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Create invoice
    const invoice = await Invoice.create({
      invoiceNumber,
      customerId,
      issueDate: new Date(),
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      notes,
      terms,
      createdBy: req.user.id
    });
    
    // Create invoice items
    const invoiceItems = await Promise.all(
      items.map(item => 
        InvoiceItem.create({
          invoiceId: invoice.id,
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
      message: 'Invoice created successfully', 
      invoice: {
        ...invoice.toJSON(),
        items: invoiceItems
      }
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const { status, dueDate, notes, terms, items } = req.body;
    
    // Update invoice fields
    if (status) invoice.status = status;
    if (dueDate) invoice.dueDate = dueDate;
    if (notes) invoice.notes = notes;
    if (terms) invoice.terms = terms;
    
    // If items are provided, recalculate totals
    if (items && items.length > 0) {
      // Delete existing items
      await InvoiceItem.destroy({ where: { invoiceId: invoice.id } });
      
      // Calculate new totals
      let subtotal = 0;
      let taxAmount = 0;
      
      items.forEach(item => {
        const amount = parseFloat(item.quantity) * parseFloat(item.unitPrice);
        const tax = amount * (parseFloat(item.taxRate || 0) / 100);
        subtotal += amount;
        taxAmount += tax;
      });
      
      invoice.subtotal = subtotal;
      invoice.taxAmount = taxAmount;
      invoice.totalAmount = subtotal + taxAmount;
      
      // Create new items
      await Promise.all(
        items.map(item => 
          InvoiceItem.create({
            invoiceId: invoice.id,
            itemId: item.itemId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate || 0,
            amount: parseFloat(item.quantity) * parseFloat(item.unitPrice)
          })
        )
      );
    }
    
    await invoice.save();
    
    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    await invoice.destroy();
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
