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
      id: 'quotes',
      label: 'Quotes',
      icon: '📋',
      path: '/quotes'
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: '📄',
      path: '/invoices'
    },
    {
      id: 'receipts',
      label: 'Receipts',
      icon: '💰',
      path: '/receipts'
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      path: '/chat'
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
    admin: [
      menuConfig.shared[0], // Dashboard
      menuConfig.admin[0],  // Users
      menuConfig.shared[1], // Customers
      menuConfig.shared[2], // Items
      menuConfig.shared[3], // Quotes
      menuConfig.shared[4], // Invoices
      menuConfig.shared[5], // Receipts
      menuConfig.shared[6], // Chat
      menuConfig.admin[1]   // Audit Logs
    ],
    manager: [...menuConfig.manager, ...menuConfig.shared],
    user: [...menuConfig.shared]
  }
  return roleMenus[role] || menuConfig.shared
}