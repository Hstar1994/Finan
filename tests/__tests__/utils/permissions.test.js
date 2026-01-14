/**
 * Permissions Utility Tests
 * Tests for role-based permission checking
 */

const {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions
} = require('../../../src/utils/permissions');

describe('Permissions Utility', () => {
  
  describe('PERMISSIONS constant', () => {
    it('should define all expected permission categories', () => {
      // User Management
      expect(PERMISSIONS.USER_VIEW).toBe('user:view');
      expect(PERMISSIONS.USER_CREATE).toBe('user:create');
      expect(PERMISSIONS.USER_EDIT).toBe('user:edit');
      expect(PERMISSIONS.USER_DELETE).toBe('user:delete');
      
      // Customer Management
      expect(PERMISSIONS.CUSTOMER_VIEW).toBe('customer:view');
      expect(PERMISSIONS.CUSTOMER_CREATE).toBe('customer:create');
      expect(PERMISSIONS.CUSTOMER_EDIT).toBe('customer:edit');
      expect(PERMISSIONS.CUSTOMER_DELETE).toBe('customer:delete');
      
      // Invoice Management
      expect(PERMISSIONS.INVOICE_VIEW).toBe('invoice:view');
      expect(PERMISSIONS.INVOICE_CREATE).toBe('invoice:create');
      expect(PERMISSIONS.INVOICE_EDIT).toBe('invoice:edit');
      expect(PERMISSIONS.INVOICE_DELETE).toBe('invoice:delete');
      expect(PERMISSIONS.INVOICE_APPROVE).toBe('invoice:approve');
    });

    it('should have unique permission values', () => {
      const values = Object.values(PERMISSIONS);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    it('should follow naming convention (resource:action)', () => {
      Object.values(PERMISSIONS).forEach(permission => {
        expect(permission).toMatch(/^[a-z_]+:[a-z_]+$/);
      });
    });
  });

  describe('ROLE_PERMISSIONS mapping', () => {
    it('should define permissions for admin role', () => {
      expect(ROLE_PERMISSIONS.admin).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS.admin)).toBe(true);
      expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(0);
    });

    it('should define permissions for manager role', () => {
      expect(ROLE_PERMISSIONS.manager).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS.manager)).toBe(true);
      expect(ROLE_PERMISSIONS.manager.length).toBeGreaterThan(0);
    });

    it('should define permissions for user role', () => {
      expect(ROLE_PERMISSIONS.user).toBeDefined();
      expect(Array.isArray(ROLE_PERMISSIONS.user)).toBe(true);
      expect(ROLE_PERMISSIONS.user.length).toBeGreaterThan(0);
    });

    it('should give admin all permissions', () => {
      const allPermissions = Object.values(PERMISSIONS);
      allPermissions.forEach(permission => {
        expect(ROLE_PERMISSIONS.admin).toContain(permission);
      });
    });

    it('should give manager more permissions than user', () => {
      expect(ROLE_PERMISSIONS.manager.length).toBeGreaterThan(ROLE_PERMISSIONS.user.length);
    });

    it('should give admin more permissions than manager', () => {
      expect(ROLE_PERMISSIONS.admin.length).toBeGreaterThan(ROLE_PERMISSIONS.manager.length);
    });
  });

  describe('hasPermission()', () => {
    it('should return true when admin has any permission', () => {
      expect(hasPermission('admin', PERMISSIONS.USER_DELETE)).toBe(true);
      expect(hasPermission('admin', PERMISSIONS.SETTINGS_EDIT)).toBe(true);
      expect(hasPermission('admin', PERMISSIONS.AUDIT_VIEW)).toBe(true);
    });

    it('should return true when role has the permission', () => {
      expect(hasPermission('manager', PERMISSIONS.CUSTOMER_VIEW)).toBe(true);
      expect(hasPermission('user', PERMISSIONS.INVOICE_CREATE)).toBe(true);
    });

    it('should return false when role lacks the permission', () => {
      expect(hasPermission('user', PERMISSIONS.USER_DELETE)).toBe(false);
      expect(hasPermission('manager', PERMISSIONS.USER_DELETE)).toBe(false);
      expect(hasPermission('user', PERMISSIONS.SETTINGS_EDIT)).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(hasPermission('unknown', PERMISSIONS.USER_VIEW)).toBe(false);
      expect(hasPermission('', PERMISSIONS.USER_VIEW)).toBe(false);
      expect(hasPermission(null, PERMISSIONS.USER_VIEW)).toBe(false);
    });

    it('should return false for unknown permission', () => {
      expect(hasPermission('admin', 'unknown:permission')).toBe(false);
      expect(hasPermission('admin', '')).toBe(false);
    });
  });

  describe('hasAnyPermission()', () => {
    it('should return true if role has any of the permissions', () => {
      expect(hasAnyPermission('user', [
        PERMISSIONS.USER_DELETE,  // doesn't have
        PERMISSIONS.CUSTOMER_VIEW // has this
      ])).toBe(true);
    });

    it('should return false if role has none of the permissions', () => {
      expect(hasAnyPermission('user', [
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT
      ])).toBe(false);
    });

    it('should return true for admin with any permissions', () => {
      expect(hasAnyPermission('admin', [
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT
      ])).toBe(true);
    });

    it('should return false for empty permissions array', () => {
      expect(hasAnyPermission('admin', [])).toBe(false);
    });

    it('should handle unknown role', () => {
      expect(hasAnyPermission('unknown', [PERMISSIONS.USER_VIEW])).toBe(false);
    });
  });

  describe('hasAllPermissions()', () => {
    it('should return true if role has all permissions', () => {
      expect(hasAllPermissions('user', [
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.CUSTOMER_CREATE,
        PERMISSIONS.INVOICE_VIEW
      ])).toBe(true);
    });

    it('should return false if role lacks any permission', () => {
      expect(hasAllPermissions('user', [
        PERMISSIONS.CUSTOMER_VIEW,
        PERMISSIONS.USER_DELETE  // doesn't have
      ])).toBe(false);
    });

    it('should return true for admin with any permissions', () => {
      expect(hasAllPermissions('admin', [
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.AUDIT_VIEW
      ])).toBe(true);
    });

    it('should return true for empty permissions array', () => {
      expect(hasAllPermissions('user', [])).toBe(true);
    });

    it('should handle unknown role', () => {
      expect(hasAllPermissions('unknown', [PERMISSIONS.USER_VIEW])).toBe(false);
    });
  });

  describe('getRolePermissions()', () => {
    it('should return all permissions for a valid role', () => {
      const adminPerms = getRolePermissions('admin');
      expect(Array.isArray(adminPerms)).toBe(true);
      expect(adminPerms.length).toBe(Object.values(PERMISSIONS).length);
    });

    it('should return permissions for manager role', () => {
      const managerPerms = getRolePermissions('manager');
      expect(Array.isArray(managerPerms)).toBe(true);
      expect(managerPerms.length).toBeGreaterThan(0);
      expect(managerPerms).toContain(PERMISSIONS.CUSTOMER_VIEW);
    });

    it('should return permissions for user role', () => {
      const userPerms = getRolePermissions('user');
      expect(Array.isArray(userPerms)).toBe(true);
      expect(userPerms.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown role', () => {
      expect(getRolePermissions('unknown')).toEqual([]);
      expect(getRolePermissions('')).toEqual([]);
      expect(getRolePermissions(null)).toEqual([]);
    });
  });

  describe('Role-specific permission checks', () => {
    describe('Admin role', () => {
      it('should have delete permissions', () => {
        expect(hasPermission('admin', PERMISSIONS.USER_DELETE)).toBe(true);
        expect(hasPermission('admin', PERMISSIONS.CUSTOMER_DELETE)).toBe(true);
        expect(hasPermission('admin', PERMISSIONS.INVOICE_DELETE)).toBe(true);
      });

      it('should have settings edit permission', () => {
        expect(hasPermission('admin', PERMISSIONS.SETTINGS_EDIT)).toBe(true);
      });
    });

    describe('Manager role', () => {
      it('should have approval permissions', () => {
        expect(hasPermission('manager', PERMISSIONS.INVOICE_APPROVE)).toBe(true);
        expect(hasPermission('manager', PERMISSIONS.QUOTE_APPROVE)).toBe(true);
      });

      it('should NOT have delete user permission', () => {
        expect(hasPermission('manager', PERMISSIONS.USER_DELETE)).toBe(false);
      });

      it('should NOT have settings edit permission', () => {
        expect(hasPermission('manager', PERMISSIONS.SETTINGS_EDIT)).toBe(false);
      });

      it('should have audit view permission', () => {
        expect(hasPermission('manager', PERMISSIONS.AUDIT_VIEW)).toBe(true);
      });
    });

    describe('User role', () => {
      it('should have basic CRUD permissions for work resources', () => {
        expect(hasPermission('user', PERMISSIONS.CUSTOMER_VIEW)).toBe(true);
        expect(hasPermission('user', PERMISSIONS.CUSTOMER_CREATE)).toBe(true);
        expect(hasPermission('user', PERMISSIONS.INVOICE_CREATE)).toBe(true);
        expect(hasPermission('user', PERMISSIONS.QUOTE_CREATE)).toBe(true);
      });

      it('should NOT have approval permissions', () => {
        expect(hasPermission('user', PERMISSIONS.INVOICE_APPROVE)).toBe(false);
        expect(hasPermission('user', PERMISSIONS.QUOTE_APPROVE)).toBe(false);
      });

      it('should NOT have delete permissions for core resources', () => {
        expect(hasPermission('user', PERMISSIONS.CUSTOMER_DELETE)).toBe(false);
        expect(hasPermission('user', PERMISSIONS.INVOICE_DELETE)).toBe(false);
      });

      it('should have read-only report access', () => {
        expect(hasPermission('user', PERMISSIONS.REPORT_VIEW)).toBe(true);
        expect(hasPermission('user', PERMISSIONS.REPORT_EXPORT)).toBe(false);
      });
    });
  });
});
