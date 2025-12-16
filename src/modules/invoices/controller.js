const { Invoice, InvoiceItem, Customer, Item } = require('../../database/models');
const { sequelize } = require('../../database/connection');
const { Op } = require('sequelize');
const { generateInvoiceNumber } = require('../../utils/numberGenerator');

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
  const t = await sequelize.transaction();
  
  try {
    const { customerId, dueDate, items, notes, terms } = req.body;
    
    if (!customerId || !dueDate || !items || items.length === 0) {
      await t.rollback();
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
    
    // Check customer credit limit before creating invoice
    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (!customer) {
      await t.rollback();
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    if (!customer.canPurchase(totalAmount)) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Invoice amount exceeds customer credit limit',
        details: {
          totalAmount,
          currentBalance: customer.balance,
          creditLimit: customer.creditLimit,
          availableCredit: customer.getAvailableCredit()
        }
      });
    }
    
    // Generate invoice number (pass transaction to ensure consistency)
    const invoiceNumber = await generateInvoiceNumber(t);
    
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
    }, { transaction: t });
    
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
        }, { transaction: t })
      )
    );
    
    // Update customer balance (increase balance as invoice is created)
    // customer already fetched above for credit limit check
    customer.balance = parseFloat(customer.balance) + totalAmount;
    await customer.save({ transaction: t });
    
    await t.commit();
    
    res.status(201).json({ 
      message: 'Invoice created successfully', 
      invoice: {
        ...invoice.toJSON(),
        items: invoiceItems
      }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

const update = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const invoice = await Invoice.findByPk(req.params.id, { transaction: t });
    
    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const { status, dueDate, notes, terms, items } = req.body;
    
    const oldTotalAmount = parseFloat(invoice.totalAmount);
    
    // Update invoice fields
    if (status) invoice.status = status;
    if (dueDate) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (terms !== undefined) invoice.terms = terms;
    
    // If items are provided, recalculate totals
    if (items && items.length > 0) {
      // Delete existing items
      await InvoiceItem.destroy({ where: { invoiceId: invoice.id }, transaction: t });
      
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
          }, { transaction: t })
        )
      );
      
      // Update customer balance if total amount changed
      const newTotalAmount = parseFloat(invoice.totalAmount);
      if (newTotalAmount !== oldTotalAmount) {
        const customer = await Customer.findByPk(invoice.customerId, { transaction: t });
        if (customer) {
          const balanceDifference = newTotalAmount - oldTotalAmount;
          customer.balance = parseFloat(customer.balance) + balanceDifference;
          await customer.save({ transaction: t });
        }
      }
    }
    
    await invoice.save({ transaction: t });
    await t.commit();
    
    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

const remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const invoice = await Invoice.findByPk(req.params.id, { transaction: t });
    
    if (!invoice) {
      await t.rollback();
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    // Check if invoice has payments
    if (parseFloat(invoice.amountPaid) > 0) {
      await t.rollback();
      return res.status(400).json({ 
        error: 'Cannot delete invoice with payments. Please delete associated receipts first.' 
      });
    }
    
    const invoiceTotalAmount = parseFloat(invoice.totalAmount);
    
    // Update customer balance (decrease balance as invoice is removed)
    const customer = await Customer.findByPk(invoice.customerId, { transaction: t });
    if (customer) {
      customer.balance = parseFloat(customer.balance) - invoiceTotalAmount;
      await customer.save({ transaction: t });
    }
    
    await invoice.destroy({ transaction: t });
    await t.commit();
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    await t.rollback();
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
