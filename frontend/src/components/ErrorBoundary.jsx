import React from 'react'
import './ErrorBoundary.css'
import { config } from '../config/env'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    if (config.isDevelopment) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Store error details in state
    this.setState({
      error,
      errorInfo
    })

    // In production, you could send error to a logging service here
    // Example: logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">⚠️</div>
            <h1 className="error-boundary-title">Oops! Something went wrong</h1>
            <p className="error-boundary-message">
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </p>
            
            <div className="error-boundary-actions">
              <button 
                className="error-boundary-btn error-boundary-btn-primary"
                onClick={this.handleReload}
              >
                Reload Page
              </button>
              <button 
                className="error-boundary-btn error-boundary-btn-secondary"
                onClick={this.handleReset}
              >
                Try Again
              </button>
            </div>

            {config.isDevelopment && this.state.error && (
              <details className="error-boundary-details">
                <summary>Error Details (Development Only)</summary>
                <div className="error-boundary-stack">
                  <p><strong>Error:</strong> {this.state.error.toString()}</p>
                  {this.state.errorInfo && (
                    <pre>{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}

            <p className="error-boundary-support">
              If this problem persists, please contact support or try logging out and back in.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
