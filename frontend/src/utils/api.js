const API_URL = 'http://localhost:3000/api'

export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export const isAuthenticated = () => {
  return !!getToken()
}

export const logout = () => {
  localStorage.clear()
  sessionStorage.clear()
  window.location.href = '/index-vanilla.html'
}

const apiRequest = async (endpoint, options = {}) => {
  const token = getToken()
  
  if (!token) {
    logout()
    throw new Error('No authentication token')
  }

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config)
    
    if (response.status === 401) {
      logout()
      throw new Error('Unauthorized')
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('API Request Error:', error)
    throw error
  }
}

export const getCustomers = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/customers?page=${page}&limit=${limit}`)
  return response
}

export const getInvoices = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/invoices?page=${page}&limit=${limit}`)
  return response
}

export const getUsers = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/users?page=${page}&limit=${limit}`)
  return response
}

export const getItems = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/items?page=${page}&limit=${limit}`)
  return response
}

export const getQuotes = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/quotes?page=${page}&limit=${limit}`)
  return response
}

export const getReceipts = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/receipts?page=${page}&limit=${limit}`)
  return response
}

export const getCreditNotes = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/credit-notes?page=${page}&limit=${limit}`)
  return response
}

export const getAuditLogs = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/audit?page=${page}&limit=${limit}`)
  return response
}
