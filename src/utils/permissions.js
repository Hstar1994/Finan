/**
 * Permission Definitions
 * Defines all available permissions in the system
 */

const PERMISSIONS = {
  // User Management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_EDIT: 'user:edit',
  USER_DELETE: 'user:delete',
  
  // Customer Management
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_CREATE: 'customer:create',
  CUSTOMER_EDIT: 'customer:edit',
  CUSTOMER_DELETE: 'customer:delete',
  
  // Item Management
  ITEM_VIEW: 'item:view',
  ITEM_CREATE: 'item:create',
  ITEM_EDIT: 'item:edit',
  ITEM_DELETE: 'item:delete',
  
  // Invoice Management
  INVOICE_VIEW: 'invoice:view',
  INVOICE_CREATE: 'invoice:create',
  INVOICE_EDIT: 'invoice:edit',
  INVOICE_DELETE: 'invoice:delete',
  INVOICE_APPROVE: 'invoice:approve',
  
  // Quote Management
  QUOTE_VIEW: 'quote:view',
  QUOTE_CREATE: 'quote:create',
  QUOTE_EDIT: 'quote:edit',
  QUOTE_DELETE: 'quote:delete',
  QUOTE_APPROVE: 'quote:approve',
  
  // Receipt Management
  RECEIPT_VIEW: 'receipt:view',
  RECEIPT_CREATE: 'receipt:create',
  RECEIPT_EDIT: 'receipt:edit',
  RECEIPT_DELETE: 'receipt:delete',
  
  // Credit Note Management
  CREDIT_NOTE_VIEW: 'credit_note:view',
  CREDIT_NOTE_CREATE: 'credit_note:create',
  CREDIT_NOTE_EDIT: 'credit_note:edit',
  CREDIT_NOTE_DELETE: 'credit_note:delete',
  
  // Reports & Analytics
  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',
  
  // System Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_EDIT: 'settings:edit',
  
  // Audit Logs
  AUDIT_VIEW: 'audit:view',
};

/**
 * Role-based Permission Mapping
 * Defines what permissions each role has
 */
const ROLE_PERMISSIONS = {
  admin: [
    // Admins have all permissions
    ...Object.values(PERMISSIONS),
  ],
  
  manager: [
    // Users
    PERMISSIONS.USER_VIEW,
    
    // Customers
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_EDIT,
    
    // Items
    PERMISSIONS.ITEM_VIEW,
    PERMISSIONS.ITEM_CREATE,
    PERMISSIONS.ITEM_EDIT,
    
    // Invoices
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_EDIT,
    PERMISSIONS.INVOICE_APPROVE,
    
    // Quotes
    PERMISSIONS.QUOTE_VIEW,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_EDIT,
    PERMISSIONS.QUOTE_APPROVE,
    
    // Receipts
    PERMISSIONS.RECEIPT_VIEW,
    PERMISSIONS.RECEIPT_CREATE,
    PERMISSIONS.RECEIPT_EDIT,
    
    // Credit Notes
    PERMISSIONS.CREDIT_NOTE_VIEW,
    PERMISSIONS.CREDIT_NOTE_CREATE,
    PERMISSIONS.CREDIT_NOTE_EDIT,
    
    // Reports
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    
    // Settings (view only)
    PERMISSIONS.SETTINGS_VIEW,
    
    // Audit
    PERMISSIONS.AUDIT_VIEW,
  ],
  
  user: [
    // Customers
    PERMISSIONS.CUSTOMER_VIEW,
    PERMISSIONS.CUSTOMER_CREATE,
    PERMISSIONS.CUSTOMER_EDIT,
    
    // Items
    PERMISSIONS.ITEM_VIEW,
    PERMISSIONS.ITEM_CREATE,
    PERMISSIONS.ITEM_EDIT,
    
    // Invoices
    PERMISSIONS.INVOICE_VIEW,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_EDIT,
    
    // Quotes
    PERMISSIONS.QUOTE_VIEW,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_EDIT,
    
    // Receipts
    PERMISSIONS.RECEIPT_VIEW,
    PERMISSIONS.RECEIPT_CREATE,
    
    // Credit Notes (view only)
    PERMISSIONS.CREDIT_NOTE_VIEW,
    
    // Reports (view only)
    PERMISSIONS.REPORT_VIEW,
  ],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - User role (admin, manager, user)
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  const rolePerms = ROLE_PERMISSIONS[role] || [];
  return rolePerms.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
function hasAnyPermission(role, permissions) {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
function hasAllPermissions(role, permissions) {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]}
 */
function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

module.exports = {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
};
