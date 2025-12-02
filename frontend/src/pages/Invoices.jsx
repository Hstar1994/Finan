import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getInvoices, 
  getInvoiceById, 
  createInvoice, 
  updateInvoice, 
  deleteInvoice,
  getCustomers,
  getItems 
} from '../utils/api'
import './Invoices.css'

const Invoices = () => {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState([])
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState('')
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    dueDate: '',
    notes: '',
    terms: ''
  })
  
  // Line items state
  const [lineItems, setLineItems] = useState([])
  
  // Alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' })
  
  // Form errors
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadInvoices()
  }, [pagination.page, statusFilter])

  useEffect(() => {
    loadCustomers()
    loadItems()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      
      const data = await getInvoices(pagination.page, pagination.limit, filters)
      setInvoices(data.invoices || [])
      if (data.pagination) {
        setPagination(prev => ({ 
          ...prev, 
          total: data.pagination.total,
          totalPages: data.pagination.totalPages 
        }))
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  const loadCustomers = async () => {
    try {
      const data = await getCustomers(1, 1000, { isActive: true })
      setCustomers(data.customers || [])
    } catch (err) {
      console.error('Failed to load customers:', err)
    }
  }

  const loadItems = async () => {
    try {
      const data = await getItems(1, 1000, { isActive: true })
      setItems(data.items || [])
    } catch (err) {
      console.error('Failed to load items:', err)
    }
  }

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message })
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000)
  }

  const handleCreateInvoice = () => {
    // Set default due date to 30 days from now
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    
    setFormData({
      customerId: '',
      dueDate: dueDate.toISOString().split('T')[0],
      notes: '',
      terms: 'Payment due within 30 days'
    })
    setLineItems([{ id: Date.now(), itemId: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0 }])
    setErrors({})
    setShowCreateModal(true)
  }

  const handleViewInvoice = async (invoice) => {
    try {
      const data = await getInvoiceById(invoice.id)
      setSelectedInvoice(data.invoice)
      setShowViewModal(true)
    } catch (err) {
      showAlert('error', err.message || 'Failed to load invoice details')
    }
  }

  const handleDeleteClick = (invoice) => {
    setSelectedInvoice(invoice)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteInvoice(selectedInvoice.id)
      showAlert('success', 'Invoice deleted successfully')
      setShowDeleteModal(false)
      setSelectedInvoice(null)
      loadInvoices()
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete invoice')
    }
  }

  const handleStatusChange = async (invoice, newStatus) => {
    try {
      await updateInvoice(invoice.id, { status: newStatus })
      showAlert('success', 'Invoice status updated successfully')
      loadInvoices()
    } catch (err) {
      showAlert('error', err.message || 'Failed to update invoice status')
    }
  }

  // Line item functions
  const addLineItem = () => {
    setLineItems([...lineItems, { 
      id: Date.now(), 
      itemId: '', 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      taxRate: 0 
    }])
  }

  const removeLineItem = (id) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const updateLineItem = (id, field, value) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        
        // If item is selected from catalog, auto-fill details
        if (field === 'itemId' && value) {
          const catalogItem = items.find(i => i.id === value)
          if (catalogItem) {
            updated.description = catalogItem.name
            updated.unitPrice = parseFloat(catalogItem.unitPrice || 0)
            updated.taxRate = parseFloat(catalogItem.taxRate || 0)
          }
        }
        
        return updated
      }
      return item
    }))
  }

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    let taxAmount = 0
    
    lineItems.forEach(item => {
      const amount = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)
      const tax = amount * (parseFloat(item.taxRate || 0) / 100)
      subtotal += amount
      taxAmount += tax
    })
    
    return {
      subtotal: subtotal.toFixed(2),
      tax: taxAmount.toFixed(2),
      total: (subtotal + taxAmount).toFixed(2)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required'
    }
    
    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    }
    
    const hasValidItems = lineItems.some(item => 
      item.description && item.quantity > 0 && item.unitPrice >= 0
    )
    
    if (!hasValidItems) {
      newErrors.items = 'At least one line item with description, quantity, and price is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    try {
      const invoiceData = {
        ...formData,
        items: lineItems.map(item => ({
          itemId: item.itemId || null,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          taxRate: parseFloat(item.taxRate || 0)
        }))
      }
      
      await createInvoice(invoiceData)
      showAlert('success', 'Invoice created successfully')
      setShowCreateModal(false)
      loadInvoices()
    } catch (err) {
      showAlert('error', err.message || 'Failed to create invoice')
    }
  }

  const totals = calculateTotals()

  if (loading && invoices.length === 0) {
    return <div className="invoices-page"><div className="loading-spinner">⏳ Loading invoices...</div></div>
  }

  return (
    <div className="invoices-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📄 Invoices</h1>
          <p className="page-description">Create and manage customer invoices</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateInvoice}>
          <span className="btn-icon">➕</span>
          Create Invoice
        </button>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'success' ? '✓' : '⚠'}</span>
          {alert.message}
          <button className="alert-close" onClick={() => setAlert({ show: false, type: '', message: '' })}>×</button>
        </div>
      )}

      <div className="invoices-controls">
        <div className="filters">
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📄</span>
          <h3>No invoices found</h3>
          <p>Create your first invoice to get started</p>
          <button className="btn btn-primary" onClick={handleCreateInvoice}>
            <span className="btn-icon">➕</span>
            Create Invoice
          </button>
        </div>
      ) : (
        <>
          <div className="invoices-table-container">
            <table className="invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <div className="invoice-number">
                        <span className="number">{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    <td>{invoice.customer?.name || 'N/A'}</td>
                    <td>{new Date(invoice.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                    <td>
                      <select
                        className={`status-select ${invoice.status}`}
                        value={invoice.status}
                        onChange={(e) => handleStatusChange(invoice, e.target.value)}
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <span className="amount">${parseFloat(invoice.totalAmount).toFixed(2)}</span>
                    </td>
                    <td>
                      <span className="amount-paid">${parseFloat(invoice.amountPaid || 0).toFixed(2)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action"
                          onClick={() => handleViewInvoice(invoice)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon-action"
                          onClick={() => handleDeleteClick(invoice)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.total > pagination.limit && (
            <div className="pagination">
              <button 
                className="btn btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages || Math.ceil(pagination.total / pagination.limit)}
              </span>
              <button 
                className="btn btn-secondary"
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= (pagination.totalPages || Math.ceil(pagination.total / pagination.limit))}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Invoice</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-section">
                  <h3>Invoice Details</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        Customer <span className="required">*</span>
                      </label>
                      <select
                        value={formData.customerId}
                        onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                        className={errors.customerId ? 'error' : ''}
                      >
                        <option value="">Select Customer</option>
                        {customers.map(customer => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </select>
                      {errors.customerId && <span className="error-message">{errors.customerId}</span>}
                    </div>
                    <div className="form-group">
                      <label>
                        Due Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className={errors.dueDate ? 'error' : ''}
                      />
                      {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>Notes</label>
                      <textarea
                        rows="3"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div className="form-group full-width">
                      <label>Terms & Conditions</label>
                      <textarea
                        rows="3"
                        value={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                        placeholder="Payment terms..."
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <div className="section-header">
                    <h3>Line Items</h3>
                    <button type="button" className="btn btn-primary btn-sm" onClick={addLineItem}>
                      ➕ Add Item
                    </button>
                  </div>
                  
                  {errors.items && <p className="warning-text">{errors.items}</p>}
                  
                  <div className="line-items">
                    {lineItems.map((item, index) => (
                      <div key={item.id} className="line-item">
                        <div className="line-item-header">
                          <span className="line-item-number">Item {index + 1}</span>
                          {lineItems.length > 1 && (
                            <button 
                              type="button" 
                              className="btn-remove"
                              onClick={() => removeLineItem(item.id)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="line-item-grid">
                          <div className="form-group">
                            <label>Item (Optional)</label>
                            <select
                              value={item.itemId}
                              onChange={(e) => updateLineItem(item.id, 'itemId', e.target.value)}
                            >
                              <option value="">Custom Item</option>
                              {items.map(catalogItem => (
                                <option key={catalogItem.id} value={catalogItem.id}>
                                  {catalogItem.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Description *</label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                          <div className="form-group">
                            <label>Quantity *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Unit Price *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Tax Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={item.taxRate}
                              onChange={(e) => updateLineItem(item.id, 'taxRate', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>Amount</label>
                            <div className="amount-display">
                              ${(parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="totals-summary">
                    <div className="total-row">
                      <span>Subtotal:</span>
                      <span>${totals.subtotal}</span>
                    </div>
                    <div className="total-row">
                      <span>Tax:</span>
                      <span>${totals.tax}</span>
                    </div>
                    <div className="total-row total">
                      <span>Total:</span>
                      <span>${totals.total}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Invoice Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="invoice-view">
                <div className="invoice-info-grid">
                  <div className="info-item">
                    <span className="label">Invoice Number</span>
                    <span className="value">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Status</span>
                    <span className={`status-badge ${selectedInvoice.status}`}>
                      {selectedInvoice.status}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Customer</span>
                    <span className="value">{selectedInvoice.customer?.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Customer Email</span>
                    <span className="value">{selectedInvoice.customer?.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Issue Date</span>
                    <span className="value">{new Date(selectedInvoice.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Due Date</span>
                    <span className="value">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="invoice-items">
                  <h3>Line Items</h3>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Tax Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items?.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>{parseFloat(item.quantity).toFixed(2)}</td>
                          <td>${parseFloat(item.unitPrice).toFixed(2)}</td>
                          <td>{parseFloat(item.taxRate).toFixed(2)}%</td>
                          <td>${parseFloat(item.amount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-totals">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>${parseFloat(selectedInvoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>Tax:</span>
                    <span>${parseFloat(selectedInvoice.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="total-row total">
                    <span>Total Amount:</span>
                    <span>${parseFloat(selectedInvoice.totalAmount).toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>Amount Paid:</span>
                    <span className="amount-paid">${parseFloat(selectedInvoice.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="total-row balance">
                    <span>Balance Due:</span>
                    <span>${(parseFloat(selectedInvoice.totalAmount) - parseFloat(selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="invoice-section">
                    <h4>Notes</h4>
                    <p>{selectedInvoice.notes}</p>
                  </div>
                )}

                {selectedInvoice.terms && (
                  <div className="invoice-section">
                    <h4>Terms & Conditions</h4>
                    <p>{selectedInvoice.terms}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete invoice <strong>{selectedInvoice.invoiceNumber}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices