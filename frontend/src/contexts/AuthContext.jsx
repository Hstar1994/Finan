import React, { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { config } from '../config/env'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  // Validate token and fetch user profile
  const validateToken = async (authToken) => {
    try {
      const response = await fetch(`${config.apiUrl}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Token validation failed')
      }

      const data = await response.json()
      return data.success ? data.data.user : null
    } catch (error) {
      // Token validation failed - silent fail, user will need to login
      return null
    }
  }

  // Initialize auth state from storage and validate token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || sessionStorage.getItem('token')
      
      if (storedToken) {
        // Validate token with backend
        const validatedUser = await validateToken(storedToken)
        
        if (validatedUser) {
          setToken(storedToken)
          setUser(validatedUser)
          
          // Update stored user data with validated info
          const storage = localStorage.getItem('token') ? localStorage : sessionStorage
          storage.setItem('user', JSON.stringify(validatedUser))
        } else {
          // Token is invalid, clear storage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
        }
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch(`${config.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Login failed')
      }

      // Store token and user
      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem('token', data.data.token)
      storage.setItem('user', JSON.stringify(data.data.user))

      setToken(data.data.token)
      setUser(data.data.user)

      return { success: true, user: data.data.user }
    } catch (error) {
      // Provide more specific error messages
      if (error.message === 'Failed to fetch') {
        return { 
          success: false, 
          error: 'Unable to connect to server. Please check if the backend is running at ' + config.apiUrl 
        }
      }
      
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    // Clear storage
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')

    // Clear state
    setToken(null)
    setUser(null)

    // Redirect to login
    navigate('/login')
  }

  const isAuthenticated = () => {
    return !!token && !!user
  }

  const hasRole = (role) => {
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role)
    }
    return user.role === role
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    hasRole,
    login,
    logout,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
