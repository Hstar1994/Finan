const jwt = require('jsonwebtoken');
const { User } = require('../../database/models');
const config = require('../../config');
const ApiResponse = require('../../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Only admins can create admin/manager users
    if ((role === 'admin' || role === 'manager') && req.user?.role !== 'admin') {
      return ApiResponse.forbidden(res, 'Only admins can create admin or manager users');
    }
    
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user'
    });
    
    return ApiResponse.created(res, { user }, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ where: { email } });
    
    if (!user || !user.isActive) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }
    
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      return ApiResponse.unauthorized(res, 'Invalid credentials');
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    return ApiResponse.success(res, { token, user }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    return ApiResponse.success(res, { user: req.user }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, email } = req.body;
    const user = req.user;
    
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    
    await user.save();
    
    return ApiResponse.success(res, { user }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findByPk(req.user.id);
    const isValid = await user.validatePassword(currentPassword);
    
    if (!isValid) {
      return ApiResponse.error(res, 'Current password is incorrect', null, 401);
    }
    
    user.password = newPassword;
    await user.save();
    
    return ApiResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return ApiResponse.error(res, 'User ID and new password are required');
    }
    
    // Only admins can reset passwords
    if (req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'Only admins can reset user passwords');
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return ApiResponse.notFound(res, 'User not found');
    }
    
    user.password = newPassword;
    await user.save();
    
    // Log the action
    const { logAction } = require('../audit/controller');
    await logAction({
      userId: req.user.id,
      action: 'password_reset',
      resourceType: 'User',
      resourceId: user.id,
      details: {
        targetUser: user.email,
        resetBy: req.user.email,
      },
    });
    
    return ApiResponse.success(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    // The user is already authenticated via the authenticate middleware
    // Generate a new token with the same user data
    const user = await User.findByPk(req.user.id);
    
    if (!user || !user.isActive) {
      return ApiResponse.unauthorized(res, 'User not found or inactive');
    }
    
    // Generate new token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn || '24h' }
    );
    
    return ApiResponse.success(res, { 
      token, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  resetUserPassword,
  refreshToken
};
