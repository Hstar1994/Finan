export const menuConfig = {
  shared: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      path: '/dashboard'
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: '👥',
      path: '/customers'
    },
    {
      id: 'items',
      label: 'Items',
      icon: '🏷️',
      path: '/items'
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: '📄',
      path: '/invoices'
    },
    {
      id: 'quotes',
      label: 'Quotes',
      icon: '📋',
      path: '/quotes'
    },
    {
      id: 'receipts',
      label: 'Receipts',
      icon: '💰',
      path: '/receipts'
    }
  ],
  user: [],
  manager: [],
  admin: [
    {
      id: 'users',
      label: 'Users',
      icon: '🔑',
      path: '/users'
    },
    {
      id: 'audit-logs',
      label: 'Audit Logs',
      icon: '📝',
      path: '/audit-logs'
    }
  ]
}

export const getMenuForRole = (role) => {
  const roleMenus = {
    admin: [...menuConfig.admin, ...menuConfig.manager, ...menuConfig.shared],
    manager: [...menuConfig.manager, ...menuConfig.shared],
    user: [...menuConfig.shared]
  }
  return roleMenus[role] || menuConfig.shared
}