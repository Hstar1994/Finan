import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutProvider } from './contexts/LayoutContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Items from './pages/Items'
import Invoices from './pages/Invoices'
import Quotes from './pages/Quotes'
import Receipts from './pages/Receipts'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'

function App() {
  return (
    <BrowserRouter>
      <LayoutProvider>
        <Layout>
          <Routes>
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Protected routes - only children update */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/items" element={<Items />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/receipts" element={<Receipts />} />
            <Route path="/users" element={<Users />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            
            {/* 404 */}
            <Route path="*" element={<div><h1>404 - Page Not Found</h1></div>} />
          </Routes>
        </Layout>
      </LayoutProvider>
    </BrowserRouter>
  )
}

export default App
