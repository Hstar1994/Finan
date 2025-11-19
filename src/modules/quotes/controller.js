const { Quote, QuoteItem, Customer, Item } = require('../../database/models');

const generateQuoteNumber = async () => {
  const count = await Quote.count();
  return `QUO-${String(count + 1).padStart(6, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, customerId } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    
    const { count, rows } = await Quote.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'email'] },
        { model: QuoteItem, as: 'items' }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      quotes: rows,
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
    const quote = await Quote.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer' },
        { model: QuoteItem, as: 'items', include: [{ model: Item, as: 'item' }] }
      ]
    });
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    res.json({ quote });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { customerId, expiryDate, items, notes, terms } = req.body;
    
    if (!customerId || !expiryDate || !items || items.length === 0) {
      return res.status(400).json({ error: 'Customer, expiry date, and items are required' });
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
    const quoteNumber = await generateQuoteNumber();
    
    const quote = await Quote.create({
      quoteNumber,
      customerId,
      issueDate: new Date(),
      expiryDate,
      subtotal,
      taxAmount,
      totalAmount,
      notes,
      terms,
      createdBy: req.user.id
    });
    
    const quoteItems = await Promise.all(
      items.map(item => 
        QuoteItem.create({
          quoteId: quote.id,
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
      message: 'Quote created successfully', 
      quote: {
        ...quote.toJSON(),
        items: quoteItems
      }
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    await quote.update(req.body);
    res.json({ message: 'Quote updated successfully', quote });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    
    await quote.destroy();
    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
