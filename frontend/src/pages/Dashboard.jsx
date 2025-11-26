import React, { useState, useEffect } from 'react'
import { getCustomers, getInvoices } from '../utils/api'

const Dashboard = () => {
  const [stats, setStats] = useState({ customers: 0, invoices: 0 })
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return <div><h1>📊 Dashboard</h1><p>Loading...</p></div>
  }

  return (
    <div>
      <h1>📊 Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#7f8c8d' }}>Total Customers</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>{stats.customers}</p>
        </div>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#7f8c8d' }}>Total Invoices</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>{stats.invoices}</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard