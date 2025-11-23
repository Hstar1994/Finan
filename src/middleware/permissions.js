const { hasPermission, hasAnyPermission, hasAllPermissions } = require('../utils/permissions');

/**
 * Middleware to check if user has a specific permission
 * @param {string} permission - Required permission
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: permission,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions - Array of permissions (user needs at least one)
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!hasAnyPermission(req.user.role, permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: `One of: ${permissions.join(', ')}`,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissions - Array of permissions (user needs all of them)
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!hasAllPermissions(req.user.role, permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        required: `All of: ${permissions.join(', ')}`,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user has a specific role
 * @param {string|string[]} roles - Required role(s)
 */
function requireRole(roles) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient privileges',
        required: allowedRoles.join(' or '),
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is admin
 */
function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

/**
 * Middleware to check if user is admin or manager
 */
function requireManagerOrAdmin(req, res, next) {
  return requireRole(['admin', 'manager'])(req, res, next);
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireRole,
  requireAdmin,
  requireManagerOrAdmin,
};
