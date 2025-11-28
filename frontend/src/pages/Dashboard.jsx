import React, { useState, useEffect } from 'react'
import { useLayout } from '../contexts/LayoutContext'
import { getCustomers, getInvoices } from '../utils/api'

// Role-based permissions
const permissions = {
  admin: {
    customers: { create: true, read: true, update: true, delete: true },
    items: { create: true, read: true, update: true, delete: true },
    invoices: { create: true, read: true, update: true, delete: true },
    quotes: { create: true, read: true, update: true, delete: true },
    receipts: { create: true, read: true, update: true, delete: true },
    users: { create: true, read: true, update: true, delete: true },
    audit: { read: true },
  },
  manager: {
    customers: { create: true, read: true, update: true, delete: false },
    items: { create: true, read: true, update: true, delete: false },
    invoices: { create: true, read: true, update: true, delete: false },
    quotes: { create: true, read: true, update: true, delete: false },
    receipts: { create: true, read: true, update: true, delete: false },
    users: { create: false, read: false, update: false, delete: false },
    audit: { read: true },
  },
  user: {
    customers: { create: false, read: true, update: false, delete: false },
    items: { create: false, read: true, update: false, delete: false },
    invoices: { create: false, read: true, update: false, delete: false },
    quotes: { create: false, read: true, update: false, delete: false },
    receipts: { create: false, read: true, update: false, delete: false },
    users: { create: false, read: false, update: false, delete: false },
    audit: { read: false },
  },
}

const Dashboard = () => {
  const { user } = useLayout()
  const [stats, setStats] = useState({ customers: 0, invoices: 0 })
  const [loading, setLoading] = useState(true)
  const [loginTime] = useState(new Date().toLocaleString())

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [customersData, invoicesData] = await Promise.all([
        getCustomers(1, 1).catch(() => ({ pagination: { total: 0 } })),
        getInvoices(1, 1).catch(() => ({ pagination: { total: 0 } }))
      ])
      
      setStats({
        customers: customersData.pagination?.total || 0,
        invoices: invoicesData.pagination?.total || 0
      })
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const userPermissions = permissions[user?.role] || permissions.user

  const permissionsList = [
    { name: 'Customers', key: 'customers' },
    { name: 'Items', key: 'items' },
    { name: 'Invoices', key: 'invoices' },
    { name: 'Quotes', key: 'quotes' },
    { name: 'Receipts', key: 'receipts' },
    { name: 'Users', key: 'users' },
    { name: 'Audit Logs', key: 'audit' },
  ]

  if (loading) {
    return <div style={{ padding: '2rem' }}><h1>📊 Dashboard</h1><p>Loading...</p></div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Welcome to Finan Dashboard</h2>
        <p style={{ margin: 0, color: '#666' }}>Manage your finances efficiently</p>
      </div>

      {/* User Status Card */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>👤 Your Account Status</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <strong>User ID:</strong> <span>{user?.id}</span>
          </div>
          <div>
            <strong>Full Name:</strong> <span>{user?.firstName} {user?.lastName}</span>
          </div>
          <div>
            <strong>Email:</strong> <span>{user?.email}</span>
          </div>
          <div>
            <strong>Role:</strong> <span style={{
              background: '#3498db',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              marginLeft: '0.5rem'
            }}>{user?.role}</span>
          </div>
          <div>
            <strong>Account Status:</strong> <span style={{
              background: user?.isActive ? '#27ae60' : '#e74c3c',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginLeft: '0.5rem'
            }}>{user?.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div>
            <strong>Login Time:</strong> <span>{loginTime}</span>
          </div>
        </div>

        {/* Permissions Section */}
        <div>
          <h4 style={{ margin: '0 0 1rem 0' }}>🔐 Your Permissions</h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '0.75rem'
          }}>
            {permissionsList.map(item => {
              const perms = userPermissions[item.key]
              const actions = []
              if (perms?.create) actions.push('Create')
              if (perms?.read) actions.push('Read')
              if (perms?.update) actions.push('Update')
              if (perms?.delete) actions.push('Delete')
              
              const hasAnyPermission = actions.length > 0
              const permText = hasAnyPermission ? actions.join(', ') : 'No Access'
              
              return (
                <div key={item.key} style={{
                  padding: '0.75rem',
                  background: hasAnyPermission ? '#d4edda' : '#f8d7da',
                  borderRadius: '4px',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  fontSize: '0.9rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{hasAnyPermission ? '✓' : '✗'}</span>
                  <span>
                    <strong>{item.name}:</strong> {permText}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {[
          { icon: '👥', title: 'Customers', value: stats.customers, label: 'Total Customers' },
          { icon: '📄', title: 'Invoices', value: stats.invoices, label: 'Total Invoices' },
          { icon: '📋', title: 'Quotes', value: '-', label: 'Total Quotes' },
          { icon: '💰', title: 'Receipts', value: '-', label: 'Total Receipts' },
        ].map(stat => (
          <div key={stat.title} style={{
            background: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{stat.icon}</div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#7f8c8d' }}>{stat.title}</h4>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0', color: '#2c3e50' }}>{stat.value}</p>
            <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>ℹ️ Getting Started</h3>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li><strong>API Documentation:</strong> Visit <a href="http://localhost:3000/api-docs" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>Swagger UI</a> to explore all API endpoints</li>
          <li><strong>Backend:</strong> Running at <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>http://localhost:3000</a></li>
          <li><strong>Role-Based Access:</strong> Your role determines what actions you can perform</li>
          <li><strong>Audit Logging:</strong> All your actions are logged for security and compliance</li>
        </ul>
      </div>
    </div>
  )
}

export default Dashboard