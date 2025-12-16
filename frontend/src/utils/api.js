import { api } from '../services/apiClient';

// Auth helper functions
export const getToken = () => {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const logout = () => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = '/index-vanilla.html';
};

// Customer APIs
export const getCustomers = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/customers?${params}`);
};

export const getCustomerById = async (id) => {
  return api.get(`/customers/${id}`);
};

export const createCustomer = async (customerData) => {
  return api.post('/customers', customerData);
};

export const updateCustomer = async (id, customerData) => {
  return api.put(`/customers/${id}`, customerData);
};

export const deleteCustomer = async (id) => {
  return api.delete(`/customers/${id}`);
};

// Invoice APIs
export const getInvoices = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/invoices?${params}`);
};

export const getInvoiceById = async (id) => {
  return api.get(`/invoices/${id}`);
};

export const createInvoice = async (invoiceData) => {
  return api.post('/invoices', invoiceData);
};

export const updateInvoice = async (id, invoiceData) => {
  return api.put(`/invoices/${id}`, invoiceData);
};

export const deleteInvoice = async (id) => {
  return api.delete(`/invoices/${id}`);
};

// User APIs
export const getUsers = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/users?${params}`);
};

export const getUserById = async (id) => {
  return api.get(`/users/${id}`);
};

export const createUser = async (userData) => {
  return api.post('/users', userData);
};

export const updateUser = async (id, userData) => {
  return api.put(`/users/${id}`, userData);
};

export const deleteUser = async (id) => {
  return api.delete(`/users/${id}`);
};

export const getUserStats = async () => {
  return api.get('/users/stats');
};

// Item APIs
export const getItems = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/items?${params}`);
};

export const getItemById = async (id) => {
  return api.get(`/items/${id}`);
};

export const createItem = async (itemData) => {
  return api.post('/items', itemData);
};

export const updateItem = async (id, itemData) => {
  return api.put(`/items/${id}`, itemData);
};

export const deleteItem = async (id) => {
  return api.delete(`/items/${id}`);
};

// Quote APIs
export const getQuotes = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/quotes?${params}`);
};

export const getQuoteById = async (id) => {
  return api.get(`/quotes/${id}`);
};

export const createQuote = async (quoteData) => {
  return api.post('/quotes', quoteData);
};

export const updateQuote = async (id, quoteData) => {
  return api.put(`/quotes/${id}`, quoteData);
};

export const deleteQuote = async (id) => {
  return api.delete(`/quotes/${id}`);
};

// Receipt APIs
export const getReceipts = async (page = 1, limit = 10, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/receipts?${params}`);
};

export const getReceiptById = async (id) => {
  return api.get(`/receipts/${id}`);
};

export const createReceipt = async (receiptData) => {
  return api.post('/receipts', receiptData);
};

export const updateReceipt = async (id, receiptData) => {
  return api.put(`/receipts/${id}`, receiptData);
};

export const deleteReceipt = async (id) => {
  return api.delete(`/receipts/${id}`);
};

// Credit Note APIs
export const getCreditNotes = async (page = 1, limit = 10) => {
  return api.get(`/credit-notes?page=${page}&limit=${limit}`);
};

// Audit Log APIs
export const getAuditLogs = async (page = 1, limit = 50, filters = {}) => {
  const params = new URLSearchParams({ page, limit, ...filters });
  return api.get(`/audit?${params}`);
};

export const getAuditLogById = async (id) => {
  return api.get(`/audit/${id}`);
};
