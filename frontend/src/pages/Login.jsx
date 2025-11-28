import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './Login.css'

const Login = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  })
  
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    // Clear error when user types
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(formData.email, formData.password, formData.rememberMe)
      
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async (email, password) => {
    setFormData({ email, password, rememberMe: false })
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password, false)
      
      if (result.success) {
        navigate('/dashboard')
      } else {
        setError(result.error || 'Login failed. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Demo login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo">
          <h1>💰 Finan</h1>
          <p>Modular Financing Application</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Sign In</h2>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <div className="form-group-checkbox">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                disabled={isLoading}
              />
              <span>Remember me</span>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loader"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <div className="credential-row">
              <button
                type="button"
                className="btn-demo"
                onClick={() => handleDemoLogin('admin@finan.com', 'admin123')}
                disabled={isLoading}
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="btn-demo"
                onClick={() => handleDemoLogin('manager@finan.com', 'manager123')}
                disabled={isLoading}
              >
                👔 Manager
              </button>
              <button
                type="button"
                className="btn-demo"
                onClick={() => handleDemoLogin('user@finan.com', 'user123')}
                disabled={isLoading}
              >
                👤 User
              </button>
            </div>
          </div>
        </form>

        <div className="footer">
          <p>
            API Documentation:{' '}
            <a href="http://localhost:3000/api-docs" target="_blank" rel="noopener noreferrer">
              Swagger UI
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
