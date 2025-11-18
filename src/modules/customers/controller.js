const { Customer } = require('../../database/models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    const { count, rows } = await Customer.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      customers: rows,
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
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ customer });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json({ message: 'Customer created successfully', customer });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    await customer.update(req.body);
    res.json({ message: 'Customer updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    await customer.destroy();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const updateBalance = async (req, res, next) => {
  try {
    const { amount, operation } = req.body;
    const customer = await Customer.findByPk(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    if (operation === 'add') {
      customer.balance = parseFloat(customer.balance) + parseFloat(amount);
    } else if (operation === 'subtract') {
      customer.balance = parseFloat(customer.balance) - parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'Invalid operation. Use "add" or "subtract"' });
    }
    
    await customer.save();
    res.json({ message: 'Balance updated successfully', customer });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updateBalance
};
