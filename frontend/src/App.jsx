import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LayoutProvider } from './contexts/LayoutContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Items from './pages/Items'
import Invoices from './pages/Invoices'
import Quotes from './pages/Quotes'
import Receipts from './pages/Receipts'
import Users from './pages/Users'
import AuditLogs from './pages/AuditLogs'
import Chat from './pages/Chat'
import ErrorBoundaryTest from './pages/ErrorBoundaryTest'
import { config } from './config/env'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LayoutProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes with Layout */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      {/* Redirect root to dashboard */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      
                      {/* Application routes */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/items" element={<Items />} />
                      <Route path="/invoices" element={<Invoices />} />
                      <Route path="/quotes" element={<Quotes />} />
                      <Route path="/receipts" element={<Receipts />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/users" element={<Users />} />
                      <Route 
                        path="/audit-logs" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AuditLogs />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Development only routes */}
                      {config.isDevelopment && (
                        <Route path="/test-error-boundary" element={<ErrorBoundaryTest />} />
                      )}
                      
                      {/* 404 */}
                      <Route path="*" element={<div><h1>404 - Page Not Found</h1></div>} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
