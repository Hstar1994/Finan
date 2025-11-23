const { User, AuditLog } = require('../../database/models');

/**
 * Get all users (Admin/Manager only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search, isActive } = req.query;
    const offset = (page - 1) * limit;
    
    const where = {};
    
    // Filter by role
    if (role) {
      where.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    // Search by email, firstName, or lastName
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
      ];
    }
    
    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] },
    });
    
    res.json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single user by ID (Admin/Manager only)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new user (Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, firstName, and lastName are required',
      });
    }
    
    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }
    
    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user',
    });
    
    // Log action
    await AuditLog.create({
      userId: req.user.id,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      changes: {
        email: user.email,
        role: user.role,
        createdBy: req.user.email,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('Audit log error:', err));
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user (Admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, role, isActive } = req.body;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Prevent self-deactivation
    if (user.id === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account',
      });
    }
    
    // Prevent self-demotion from admin
    if (user.id === req.user.id && req.user.role === 'admin' && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own admin role',
      });
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'manager', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Role must be one of: ${validRoles.join(', ')}`,
        });
      }
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
    }
    
    // Update user
    const updates = {};
    if (email !== undefined) updates.email = email;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    
    await user.update(updates);
    
    // Log action
    await AuditLog.create({
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      changes: updates,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('Audit log error:', err));
    
    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (Admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }
    
    // Log action before deletion
    await AuditLog.create({
      userId: req.user.id,
      action: 'DELETE',
      entity: 'User',
      entityId: user.id,
      changes: {
        email: user.email,
        role: user.role,
        deletedBy: req.user.email,
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }).catch(err => console.error('Audit log error:', err));
    
    // Delete user
    await user.destroy();
    
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics (Admin/Manager only)
 */
const getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const adminCount = await User.count({ where: { role: 'admin' } });
    const managerCount = await User.count({ where: { role: 'manager' } });
    const userCount = await User.count({ where: { role: 'user' } });
    
    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        byRole: {
          admin: adminCount,
          manager: managerCount,
          user: userCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
};
