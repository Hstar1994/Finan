const { AuditLog, User } = require('../../database/models');
const { Op } = require('sequelize');

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, entity, action, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    if (entity) {
      where.entity = entity;
    }
    
    if (action) {
      where.action = action;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }
    
    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      logs: rows,
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
    const log = await AuditLog.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ]
    });
    
    if (!log) {
      return res.status(404).json({ error: 'Audit log not found' });
    }
    
    res.json({ log });
  } catch (error) {
    next(error);
  }
};

const getByEntity = async (req, res, next) => {
  try {
    const { entity, entityId } = req.params;
    
    const logs = await AuditLog.findAll({
      where: {
        entity,
        entityId
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ logs });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  getByEntity
};
