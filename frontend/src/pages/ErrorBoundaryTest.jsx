import React, { useState } from 'react'

/**
 * Test component for Error Boundary
 * Only available in development mode
 * 
 * This component helps verify that the ErrorBoundary is working correctly
 * by providing buttons that trigger different types of errors.
 */
const BuggyComponent = ({ shouldError }) => {
  if (shouldError) {
    // This will trigger the Error Boundary
    throw new Error('💥 Intentional error for testing Error Boundary!')
  }
  return <div>Component is working fine</div>
}

function ErrorBoundaryTest() {
  const [shouldError, setShouldError] = useState(false)

  const triggerError = () => {
    setShouldError(true)
  }

  const triggerAsyncError = () => {
    // Async errors won't be caught by Error Boundary
    setTimeout(() => {
      throw new Error('Async error - not caught by Error Boundary')
    }, 100)
  }

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: '0 0 10px 0' }}>🧪 Error Boundary Test Page</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          Test the Error Boundary implementation by triggering intentional errors
        </p>
      </div>

      <div style={{
        background: '#fff3cd',
        border: '1px solid #ffc107',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '30px'
      }}>
        <strong>⚠️ Development Only:</strong> This page is only available in development mode
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Test Scenarios</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <h3>1. Component Render Error (Will be caught ✅)</h3>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            This error occurs during component rendering and will be caught by the Error Boundary.
            You should see a beautiful error page with options to retry or reload.
          </p>
          <button
            onClick={triggerError}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Trigger Render Error
          </button>
        </div>

        <div style={{ 
          background: '#f7fafc',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <h3>2. Async Error (Won't be caught ⚠️)</h3>
          <p style={{ color: '#666', marginBottom: '10px' }}>
            Error Boundaries cannot catch errors in async code, event handlers, or setTimeout.
            This will show in the browser console but won't trigger the Error Boundary UI.
          </p>
          <button
            onClick={triggerAsyncError}
            style={{
              background: '#e2e8f0',
              color: '#2d3748',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Trigger Async Error (Check Console)
          </button>
        </div>
      </div>

      <BuggyComponent shouldError={shouldError} />

      <div style={{
        background: '#e8f5e9',
        border: '1px solid #4caf50',
        borderRadius: '8px',
        padding: '16px',
        marginTop: '30px'
      }}>
        <h3 style={{ marginTop: 0 }}>✅ What to Expect</h3>
        <ul style={{ marginBottom: 0 }}>
          <li>Click "Trigger Render Error" to see the Error Boundary in action</li>
          <li>You should see a beautiful gradient error page</li>
          <li>Error details will be visible (development mode)</li>
          <li>You can click "Try Again" or "Reload Page" to recover</li>
          <li>The entire app won't crash - just this error boundary scope</li>
        </ul>
      </div>
    </div>
  )
}

export default ErrorBoundaryTest
