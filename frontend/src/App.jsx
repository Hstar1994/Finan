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
import CreditNotes from './pages/CreditNotes'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'

function App() {
  return (
    <BrowserRouter>
      <LayoutProvider>
        <Routes>
          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Protected routes wrapped with Layout */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
          <Route path="/customers" element={<Layout><Customers /></Layout>} />
          <Route path="/items" element={<Layout><Items /></Layout>} />
          <Route path="/invoices" element={<Layout><Invoices /></Layout>} />
          <Route path="/quotes" element={<Layout><Quotes /></Layout>} />
          <Route path="/receipts" element={<Layout><Receipts /></Layout>} />
          <Route path="/credit-notes" element={<Layout><CreditNotes /></Layout>} />
          <Route path="/users" element={<Layout><Users /></Layout>} />
          <Route path="/audit-logs" element={<Layout><AuditLogs /></Layout>} />
          
          {/* 404 */}
          <Route path="*" element={<Layout><div><h1>404 - Page Not Found</h1></div></Layout>} />
        </Routes>
      </LayoutProvider>
    </BrowserRouter>
  )
}

export default App
