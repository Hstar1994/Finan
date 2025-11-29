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

export const getCustomers = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters })
  const response = await apiRequest(`/customers?${params}`)
  return response
}

export const getCustomerById = async (id) => {
  const response = await apiRequest(`/customers/${id}`)
  return response
}

export const createCustomer = async (customerData) => {
  const response = await apiRequest('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData)
  })
  return response
}

export const updateCustomer = async (id, customerData) => {
  const response = await apiRequest(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData)
  })
  return response
}

export const deleteCustomer = async (id) => {
  const response = await apiRequest(`/customers/${id}`, {
    method: 'DELETE'
  })
  return response
}

export const getInvoices = async (page = 1, limit = 10) => {
  const response = await apiRequest(`/invoices?page=${page}&limit=${limit}`)
  return response
}

export const getUsers = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters })
  const response = await apiRequest(`/users?${params}`)
  return response
}

export const getUserById = async (id) => {
  const response = await apiRequest(`/users/${id}`)
  return response
}

export const createUser = async (userData) => {
  const response = await apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(userData)
  })
  return response
}

export const updateUser = async (id, userData) => {
  const response = await apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  })
  return response
}

export const deleteUser = async (id) => {
  const response = await apiRequest(`/users/${id}`, {
    method: 'DELETE'
  })
  return response
}

export const getUserStats = async () => {
  const response = await apiRequest('/users/stats')
  return response
}

export const getItems = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters })
  const response = await apiRequest(`/items?${params}`)
  return response
}

export const getItemById = async (id) => {
  const response = await apiRequest(`/items/${id}`)
  return response
}

export const createItem = async (itemData) => {
  const response = await apiRequest('/items', {
    method: 'POST',
    body: JSON.stringify(itemData)
  })
  return response
}

export const updateItem = async (id, itemData) => {
  const response = await apiRequest(`/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(itemData)
  })
  return response
}

export const deleteItem = async (id) => {
  const response = await apiRequest(`/items/${id}`, {
    method: 'DELETE'
  })
  return response
}

export const getQuotes = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters })
  const response = await apiRequest(`/quotes?${params}`)
  return response
}

export const getQuoteById = async (id) => {
  const response = await apiRequest(`/quotes/${id}`)
  return response
}

export const createQuote = async (quoteData) => {
  const response = await apiRequest('/quotes', {
    method: 'POST',
    body: JSON.stringify(quoteData)
  })
  return response
}

export const updateQuote = async (id, quoteData) => {
  const response = await apiRequest(`/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(quoteData)
  })
  return response
}

export const deleteQuote = async (id) => {
  const response = await apiRequest(`/quotes/${id}`, {
    method: 'DELETE'
  })
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
