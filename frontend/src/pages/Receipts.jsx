import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getReceipts, 
  getReceiptById, 
  createReceipt, 
  updateReceipt, 
  deleteReceipt,
  getCustomers,
  getInvoices 
} from '../utils/api'
import './Receipts.css'

const Receipts = () => {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [customers, setCustomers] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    customerId: '',
    invoiceId: '',
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  })
  
  // Alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' })
  
  // Form errors
  const [errors, setErrors] = useState({})

  useEffect(() => {
    loadReceipts()
  }, [pagination.page])

  useEffect(() => {
    loadCustomers()
    loadInvoices()
  }, [])

  const loadReceipts = async () => {
    try {
      setLoading(true)
      const data = await getReceipts(pagination.page, pagination.limit)
      setReceipts(data.receipts || [])
      if (data.pagination) {
        setPagination(prev => ({ 
          ...prev, 
          total: data.pagination.total,
          totalPages: data.pagination.totalPages 
        }))
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load receipts')
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

  const loadInvoices = async () => {
    try {
      const data = await getInvoices(1, 1000, { status: 'sent' })
      setInvoices(data.invoices || [])
    } catch (err) {
      console.error('Failed to load invoices:', err)
    }
  }

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message })
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000)
  }

  const handleCreateReceipt = () => {
    setFormData({
      customerId: '',
      invoiceId: '',
      amount: '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().split('T')[0],
      reference: '',
      notes: ''
    })
    setErrors({})
    setShowCreateModal(true)
  }

  const handleViewReceipt = async (receipt) => {
    try {
      const data = await getReceiptById(receipt.id)
      setSelectedReceipt(data.receipt)
      setShowViewModal(true)
    } catch (err) {
      showAlert('error', err.message || 'Failed to load receipt details')
    }
  }

  const handleDeleteClick = (receipt) => {
    setSelectedReceipt(receipt)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteReceipt(selectedReceipt.id)
      showAlert('success', 'Receipt deleted successfully')
      setShowDeleteModal(false)
      setSelectedReceipt(null)
      loadReceipts()
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete receipt')
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.customerId) {
      newErrors.customerId = 'Customer is required'
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required'
    }
    
    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required'
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
      const receiptData = {
        ...formData,
        amount: parseFloat(formData.amount),
        invoiceId: formData.invoiceId || null
      }
      
      await createReceipt(receiptData)
      showAlert('success', 'Receipt created successfully')
      setShowCreateModal(false)
      loadReceipts()
    } catch (err) {
      showAlert('error', err.message || 'Failed to create receipt')
    }
  }

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💵',
      check: '📝',
      card: '💳',
      bank_transfer: '🏦',
      other: '💰'
    }
    return icons[method] || '💰'
  }

  if (loading && receipts.length === 0) {
    return <div className="receipts-page"><div className="loading-spinner">⏳ Loading receipts...</div></div>
  }

  return (
    <div className="receipts-page">
      <div className="page-header">
        <div className="header-content">
          <h1>💰 Receipts</h1>
          <p className="page-description">Track customer payments and receipts</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateReceipt}>
          <span className="btn-icon">➕</span>
          Create Receipt
        </button>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'success' ? '✓' : '⚠'}</span>
          {alert.message}
          <button className="alert-close" onClick={() => setAlert({ show: false, type: '', message: '' })}>×</button>
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💰</span>
          <h3>No receipts found</h3>
          <p>Create your first receipt to get started</p>
          <button className="btn btn-primary" onClick={handleCreateReceipt}>
            <span className="btn-icon">➕</span>
            Create Receipt
          </button>
        </div>
      ) : (
        <>
          <div className="receipts-table-container">
            <table className="receipts-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Customer</th>
                  <th>Invoice</th>
                  <th>Payment Date</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id}>
                    <td>
                      <div className="receipt-number">
                        <span className="number">{receipt.receiptNumber}</span>
                      </div>
                    </td>
                    <td>{receipt.customer?.name || 'N/A'}</td>
                    <td>
                      {receipt.invoice ? (
                        <span className="invoice-link">{receipt.invoice.invoiceNumber}</span>
                      ) : (
                        <span className="no-invoice">No Invoice</span>
                      )}
                    </td>
                    <td>{new Date(receipt.paymentDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`payment-method ${receipt.paymentMethod}`}>
                        {getPaymentMethodIcon(receipt.paymentMethod)}
                        {' '}
                        {receipt.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="amount">${parseFloat(receipt.amount).toFixed(2)}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action"
                          onClick={() => handleViewReceipt(receipt)}
                          title="View Details"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon-action"
                          onClick={() => handleDeleteClick(receipt)}
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

      {/* Create Receipt Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Receipt</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
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
                    <label>Invoice (Optional)</label>
                    <select
                      value={formData.invoiceId}
                      onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                    >
                      <option value="">No Invoice</option>
                      {invoices.map(invoice => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoiceNumber} - ${parseFloat(invoice.totalAmount).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>
                      Amount <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className={errors.amount ? 'error' : ''}
                      placeholder="0.00"
                    />
                    {errors.amount && <span className="error-message">{errors.amount}</span>}
                  </div>
                  <div className="form-group">
                    <label>
                      Payment Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      className={errors.paymentDate ? 'error' : ''}
                    />
                    {errors.paymentDate && <span className="error-message">{errors.paymentDate}</span>}
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="check">📝 Check</option>
                      <option value="card">💳 Card</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="other">💰 Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reference Number</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Check number, transaction ID, etc."
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {showViewModal && selectedReceipt && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Receipt Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="receipt-view">
                <div className="receipt-info-grid">
                  <div className="info-item">
                    <span className="label">Receipt Number</span>
                    <span className="value">{selectedReceipt.receiptNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment Date</span>
                    <span className="value">{new Date(selectedReceipt.paymentDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Customer</span>
                    <span className="value">{selectedReceipt.customer?.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Customer Email</span>
                    <span className="value">{selectedReceipt.customer?.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Invoice</span>
                    <span className="value">
                      {selectedReceipt.invoice ? (
                        <span className="invoice-link">{selectedReceipt.invoice.invoiceNumber}</span>
                      ) : (
                        <span className="no-invoice">No Invoice</span>
                      )}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Payment Method</span>
                    <span className={`payment-method ${selectedReceipt.paymentMethod}`}>
                      {getPaymentMethodIcon(selectedReceipt.paymentMethod)}
                      {' '}
                      {selectedReceipt.paymentMethod.replace('_', ' ')}
                    </span>
                  </div>
                  {selectedReceipt.reference && (
                    <div className="info-item">
                      <span className="label">Reference</span>
                      <span className="value">{selectedReceipt.reference}</span>
                    </div>
                  )}
                  <div className="info-item amount-item">
                    <span className="label">Amount Paid</span>
                    <span className="value amount-large">${parseFloat(selectedReceipt.amount).toFixed(2)}</span>
                  </div>
                </div>

                {selectedReceipt.notes && (
                  <div className="receipt-section">
                    <h4>Notes</h4>
                    <p>{selectedReceipt.notes}</p>
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
      {showDeleteModal && selectedReceipt && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete receipt <strong>{selectedReceipt.receiptNumber}</strong>?</p>
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

export default Receipts