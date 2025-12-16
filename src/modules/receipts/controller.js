const { Receipt, Customer, Invoice } = require('../../database/models');
const { sequelize } = require('../../database/connection');
const { generateReceiptNumber } = require('../../utils/numberGenerator');

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
  const t = await sequelize.transaction();
  
  try {
    const { customerId, invoiceId, amount, paymentMethod, reference, notes } = req.body;
    
    if (!customerId || !amount) {
      await t.rollback();
      return res.status(400).json({ error: 'Customer and amount are required' });
    }
    
    const paymentAmount = parseFloat(amount);
    
    if (paymentAmount <= 0) {
      await t.rollback();
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
    
    // Generate receipt number (pass transaction to ensure consistency)
    const receiptNumber = await generateReceiptNumber(t);
    
    const receipt = await Receipt.create({
      receiptNumber,
      customerId,
      invoiceId,
      paymentDate: new Date(),
      amount: paymentAmount,
      paymentMethod: paymentMethod || 'cash',
      reference,
      notes,
      createdBy: req.user.id
    }, { transaction: t });
    
    // Update invoice if linked
    if (invoiceId) {
      const invoice = await Invoice.findByPk(invoiceId, { transaction: t });
      if (invoice) {
        // Verify invoice belongs to the same customer
        if (invoice.customerId !== customerId) {
          await t.rollback();
          return res.status(400).json({ error: 'Invoice does not belong to the selected customer' });
        }
        
        invoice.amountPaid = parseFloat(invoice.amountPaid) + paymentAmount;
        
        // Prevent overpayment
        if (invoice.amountPaid > invoice.totalAmount) {
          await t.rollback();
          return res.status(400).json({ 
            error: 'Payment amount exceeds invoice balance',
            invoiceBalance: invoice.totalAmount - (invoice.amountPaid - paymentAmount)
          });
        }
        
        // Update invoice status based on payment
        if (invoice.amountPaid >= invoice.totalAmount) {
          invoice.status = 'paid';
        } else if (invoice.amountPaid > 0) {
          invoice.status = 'partial';
        }
        
        await invoice.save({ transaction: t });
      }
    }
    
    // Update customer balance (decrease balance as payment is received)
    const customer = await Customer.findByPk(customerId, { transaction: t });
    if (customer) {
      customer.balance = parseFloat(customer.balance) - paymentAmount;
      await customer.save({ transaction: t });
    }
    
    await t.commit();
    
    res.status(201).json({ message: 'Receipt created successfully', receipt });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

const update = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const receipt = await Receipt.findByPk(req.params.id, { transaction: t });
    
    if (!receipt) {
      await t.rollback();
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const { amount, paymentMethod, reference, notes } = req.body;
    
    // If amount is being changed, we need to update balances
    if (amount && parseFloat(amount) !== parseFloat(receipt.amount)) {
      const oldAmount = parseFloat(receipt.amount);
      const newAmount = parseFloat(amount);
      const amountDifference = newAmount - oldAmount;
      
      // Update invoice if linked
      if (receipt.invoiceId) {
        const invoice = await Invoice.findByPk(receipt.invoiceId, { transaction: t });
        if (invoice) {
          invoice.amountPaid = parseFloat(invoice.amountPaid) + amountDifference;
          
          // Prevent overpayment
          if (invoice.amountPaid > invoice.totalAmount) {
            await t.rollback();
            return res.status(400).json({ 
              error: 'Updated amount would exceed invoice balance',
              invoiceBalance: invoice.totalAmount - (invoice.amountPaid - amountDifference)
            });
          }
          
          // Update invoice status
          if (invoice.amountPaid >= invoice.totalAmount) {
            invoice.status = 'paid';
          } else if (invoice.amountPaid > 0) {
            invoice.status = 'partial';
          } else {
            invoice.status = invoice.status === 'paid' || invoice.status === 'partial' ? 'sent' : invoice.status;
          }
          
          await invoice.save({ transaction: t });
        }
      }
      
      // Update customer balance
      const customer = await Customer.findByPk(receipt.customerId, { transaction: t });
      if (customer) {
        customer.balance = parseFloat(customer.balance) - amountDifference;
        await customer.save({ transaction: t });
      }
      
      receipt.amount = newAmount;
    }
    
    // Update other fields
    if (paymentMethod) receipt.paymentMethod = paymentMethod;
    if (reference !== undefined) receipt.reference = reference;
    if (notes !== undefined) receipt.notes = notes;
    
    await receipt.save({ transaction: t });
    await t.commit();
    
    res.json({ message: 'Receipt updated successfully', receipt });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

const remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  
  try {
    const receipt = await Receipt.findByPk(req.params.id, { transaction: t });
    
    if (!receipt) {
      await t.rollback();
      return res.status(404).json({ error: 'Receipt not found' });
    }
    
    const receiptAmount = parseFloat(receipt.amount);
    
    // Reverse invoice payment if linked
    if (receipt.invoiceId) {
      const invoice = await Invoice.findByPk(receipt.invoiceId, { transaction: t });
      if (invoice) {
        invoice.amountPaid = parseFloat(invoice.amountPaid) - receiptAmount;
        
        // Update invoice status
        if (invoice.amountPaid >= invoice.totalAmount) {
          invoice.status = 'paid';
        } else if (invoice.amountPaid > 0) {
          invoice.status = 'partial';
        } else {
          invoice.status = invoice.status === 'paid' || invoice.status === 'partial' ? 'sent' : invoice.status;
        }
        
        await invoice.save({ transaction: t });
      }
    }
    
    // Reverse customer balance (add back the payment amount)
    const customer = await Customer.findByPk(receipt.customerId, { transaction: t });
    if (customer) {
      customer.balance = parseFloat(customer.balance) + receiptAmount;
      await customer.save({ transaction: t });
    }
    
    await receipt.destroy({ transaction: t });
    await t.commit();
    
    res.json({ message: 'Receipt deleted successfully' });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
