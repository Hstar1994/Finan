const jwt = require('jsonwebtoken');
const { User } = require('../../database/models');
const config = require('../../config');

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Only admins can create admin/manager users
    if ((role === 'admin' || role === 'manager') && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create admin or manager users' });
    }
    
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'user'
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const user = await User.findOne({ where: { email } });
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await user.validatePassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({ user: req.user });
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
    
    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    
    const user = await User.findByPk(req.user.id);
    const isValid = await user.validatePassword(currentPassword);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({ 
        success: false,
        error: 'User ID and new password are required' 
      });
    }
    
    // Only admins can reset passwords
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Only admins can reset user passwords' 
      });
    }
    
    const user = await User.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
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
    
    res.json({ 
      success: true,
      message: 'Password reset successfully' 
    });
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
      return res.status(401).json({ 
        success: false,
        error: 'User not found or inactive' 
      });
    }
    
    // Generate new token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiration || '24h' }
    );
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });
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
