import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getQuotes, getQuoteById, createQuote, updateQuote, deleteQuote, getCustomers, getItems } from '../utils/api'
import './Quotes.css'

const Quotes = () => {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalQuotes, setTotalQuotes] = useState(0)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    expiryDate: '',
    notes: '',
    terms: ''
  })

  // Line items
  const [lineItems, setLineItems] = useState([])

  // Customers and Items for dropdowns
  const [customers, setCustomers] = useState([])
  const [items, setItems] = useState([])

  const [formErrors, setFormErrors] = useState({})

  const statuses = ['draft', 'sent', 'accepted', 'rejected', 'expired']

  useEffect(() => {
    loadQuotes()
    loadCustomers()
    loadItems()
  }, [currentPage, statusFilter])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (statusFilter !== 'all') filters.status = statusFilter

      const data = await getQuotes(currentPage, 10, filters)
      
      setQuotes(data.quotes || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalQuotes(data.pagination?.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load quotes')
      setQuotes([])
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

  const handleCreateQuote = () => {
    const today = new Date()
    const defaultExpiry = new Date(today.setMonth(today.getMonth() + 1))
    
    setFormData({
      customerId: '',
      expiryDate: defaultExpiry.toISOString().split('T')[0],
      notes: '',
      terms: 'Payment due within 30 days'
    })
    setLineItems([{
      id: Date.now(),
      itemId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 0
    }])
    setFormErrors({})
    setShowCreateModal(true)
  }

  const handleViewQuote = async (quote) => {
    try {
      const data = await getQuoteById(quote.id)
      setSelectedQuote(data.quote)
      setShowViewModal(true)
    } catch (err) {
      setError(err.message || 'Failed to fetch quote details')
    }
  }

  const handleDeleteClick = (quote) => {
    setSelectedQuote(quote)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteQuote(selectedQuote.id)
      setSuccessMessage('Quote deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      setSelectedQuote(null)
      loadQuotes()
    } catch (err) {
      setError(err.message || 'Failed to delete quote')
      setShowDeleteModal(false)
    }
  }

  const handleStatusChange = async (quote, newStatus) => {
    try {
      await updateQuote(quote.id, { status: newStatus })
      setSuccessMessage(`Quote status updated to ${newStatus}`)
      setTimeout(() => setSuccessMessage(''), 3000)
      loadQuotes()
    } catch (err) {
      setError(err.message || 'Failed to update quote status')
    }
  }

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
        
        // Auto-fill from selected item
        if (field === 'itemId' && value) {
          const selectedItem = items.find(i => i.id === value)
          if (selectedItem) {
            updated.description = selectedItem.name
            updated.unitPrice = parseFloat(selectedItem.unitPrice) || 0
            updated.taxRate = parseFloat(selectedItem.taxRate) || 0
          }
        }
        
        return updated
      }
      return item
    }))
  }

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
      taxAmount: taxAmount.toFixed(2),
      total: (subtotal + taxAmount).toFixed(2)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.customerId) {
      errors.customerId = 'Customer is required'
    }

    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required'
    }

    if (lineItems.length === 0 || !lineItems.some(item => item.description)) {
      errors.lineItems = 'At least one line item is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const quoteData = {
        customerId: formData.customerId,
        expiryDate: formData.expiryDate,
        notes: formData.notes,
        terms: formData.terms,
        items: lineItems.map(item => ({
          itemId: item.itemId || null,
          description: item.description,
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          taxRate: parseFloat(item.taxRate) || 0
        }))
      }

      await createQuote(quoteData)
      setSuccessMessage('Quote created successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCreateModal(false)
      loadQuotes()
    } catch (err) {
      setError(err.message || 'Failed to create quote')
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      draft: 'draft',
      sent: 'sent',
      accepted: 'accepted',
      rejected: 'rejected',
      expired: 'expired'
    }
    return statusMap[status] || 'draft'
  }

  const totals = calculateTotals()

  return (
    <div className="quotes-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Quotes</h1>
          <p className="page-description">Manage customer quotes and estimates</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateQuote}>
          <span className="btn-icon">➕</span>
          Create Quote
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          <button className="alert-close" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {successMessage}
        </div>
      )}

      <div className="quotes-controls">
        <div className="filters">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="filter-select"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="quotes-stats">
        <div className="stat-card">
          <span className="stat-label">Total Quotes</span>
          <span className="stat-value">{totalQuotes}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading quotes...</div>
      ) : quotes.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No quotes found</h3>
          <p>Get started by creating your first quote</p>
          <button className="btn btn-primary" onClick={handleCreateQuote}>
            Create Quote
          </button>
        </div>
      ) : (
        <>
          <div className="quotes-table-container">
            <table className="quotes-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Customer</th>
                  <th>Issue Date</th>
                  <th>Expiry Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(quote => (
                  <tr key={quote.id}>
                    <td className="quote-number">
                      <span className="number">{quote.quoteNumber}</span>
                    </td>
                    <td>{quote.customer?.name || 'N/A'}</td>
                    <td>{formatDate(quote.issueDate)}</td>
                    <td>{formatDate(quote.expiryDate)}</td>
                    <td className="amount">{formatCurrency(quote.totalAmount)}</td>
                    <td>
                      <select
                        value={quote.status}
                        onChange={(e) => handleStatusChange(quote, e.target.value)}
                        className={`status-select ${getStatusBadgeClass(quote.status)}`}
                      >
                        {statuses.map(status => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action view"
                          onClick={() => handleViewQuote(quote)}
                          title="View quote"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon-action delete"
                          onClick={() => handleDeleteClick(quote)}
                          title="Delete quote"
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

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Quote Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Quote</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-section">
                <h3>Customer & Details</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="customerId">
                      Customer <span className="required">*</span>
                    </label>
                    <select
                      id="customerId"
                      name="customerId"
                      value={formData.customerId}
                      onChange={handleFormChange}
                      className={formErrors.customerId ? 'error' : ''}
                      required
                    >
                      <option value="">Select Customer</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                    {formErrors.customerId && (
                      <span className="error-message">{formErrors.customerId}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="expiryDate">
                      Expiry Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="expiryDate"
                      name="expiryDate"
                      value={formData.expiryDate}
                      onChange={handleFormChange}
                      className={formErrors.expiryDate ? 'error' : ''}
                      required
                    />
                    {formErrors.expiryDate && (
                      <span className="error-message">{formErrors.expiryDate}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="section-header">
                  <h3>Line Items</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addLineItem}>
                    ➕ Add Item
                  </button>
                </div>
                
                {formErrors.lineItems && (
                  <span className="error-message">{formErrors.lineItems}</span>
                )}

                <div className="line-items">
                  {lineItems.map((lineItem, index) => (
                    <div key={lineItem.id} className="line-item">
                      <div className="line-item-header">
                        <span className="line-item-number">#{index + 1}</span>
                        {lineItems.length > 1 && (
                          <button
                            type="button"
                            className="btn-remove"
                            onClick={() => removeLineItem(lineItem.id)}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      <div className="line-item-grid">
                        <div className="form-group">
                          <label>Item (Optional)</label>
                          <select
                            value={lineItem.itemId}
                            onChange={(e) => updateLineItem(lineItem.id, 'itemId', e.target.value)}
                          >
                            <option value="">Custom Item</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} - {formatCurrency(item.unitPrice)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Description *</label>
                          <input
                            type="text"
                            value={lineItem.description}
                            onChange={(e) => updateLineItem(lineItem.id, 'description', e.target.value)}
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Quantity *</label>
                          <input
                            type="number"
                            value={lineItem.quantity}
                            onChange={(e) => updateLineItem(lineItem.id, 'quantity', e.target.value)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Unit Price *</label>
                          <input
                            type="number"
                            value={lineItem.unitPrice}
                            onChange={(e) => updateLineItem(lineItem.id, 'unitPrice', e.target.value)}
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label>Tax Rate (%)</label>
                          <input
                            type="number"
                            value={lineItem.taxRate}
                            onChange={(e) => updateLineItem(lineItem.id, 'taxRate', e.target.value)}
                            min="0"
                            max="100"
                            step="0.01"
                          />
                        </div>

                        <div className="form-group">
                          <label>Amount</label>
                          <div className="amount-display">
                            {formatCurrency(
                              (parseFloat(lineItem.quantity) || 0) * (parseFloat(lineItem.unitPrice) || 0)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="totals-summary">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="total-row">
                    <span>Tax:</span>
                    <span>{formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <div className="total-row total">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Additional Information</h3>
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="notes">Notes</label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleFormChange}
                      rows="2"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="terms">Terms & Conditions</label>
                    <textarea
                      id="terms"
                      name="terms"
                      value={formData.terms}
                      onChange={handleFormChange}
                      rows="2"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Quote Modal */}
      {showViewModal && selectedQuote && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quote Details - {selectedQuote.quoteNumber}</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body quote-view">
              <div className="quote-info-grid">
                <div className="info-item">
                  <span className="label">Customer:</span>
                  <span className="value">{selectedQuote.customer?.name}</span>
                </div>
                <div className="info-item">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${getStatusBadgeClass(selectedQuote.status)}`}>
                    {selectedQuote.status}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Issue Date:</span>
                  <span className="value">{formatDate(selectedQuote.issueDate)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Expiry Date:</span>
                  <span className="value">{formatDate(selectedQuote.expiryDate)}</span>
                </div>
              </div>

              <div className="quote-items">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Tax Rate</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.description}</td>
                        <td>{parseFloat(item.quantity)}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{parseFloat(item.taxRate)}%</td>
                        <td>{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="quote-totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedQuote.subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>{formatCurrency(selectedQuote.taxAmount)}</span>
                </div>
                <div className="total-row total">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedQuote.totalAmount)}</span>
                </div>
              </div>

              {selectedQuote.notes && (
                <div className="quote-section">
                  <h4>Notes</h4>
                  <p>{selectedQuote.notes}</p>
                </div>
              )}

              {selectedQuote.terms && (
                <div className="quote-section">
                  <h4>Terms & Conditions</h4>
                  <p>{selectedQuote.terms}</p>
                </div>
              )}
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
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Quote</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedQuote?.quoteNumber}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete}>
                Delete Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quotes
