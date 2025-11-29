import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from '../utils/api'
import './Customers.css'

const Customers = () => {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCustomers, setTotalCustomers] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    taxId: '',
    creditLimit: '0.00',
    isActive: true
  })

  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    loadCustomers()
  }, [currentPage, searchTerm, statusFilter])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (searchTerm) filters.search = searchTerm
      if (statusFilter !== 'all') filters.isActive = statusFilter === 'active'

      const data = await getCustomers(currentPage, 10, filters)
      
      setCustomers(data.customers || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalCustomers(data.pagination?.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load customers')
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCustomer = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      taxId: '',
      creditLimit: '0.00',
      isActive: true
    })
    setFormErrors({})
    setShowCreateModal(true)
  }

  const handleEditCustomer = async (customer) => {
    try {
      // Fetch full customer details
      const data = await getCustomerById(customer.id)
      setSelectedCustomer(data.customer)
      setFormData({
        name: data.customer.name || '',
        email: data.customer.email || '',
        phone: data.customer.phone || '',
        address: data.customer.address || '',
        city: data.customer.city || '',
        state: data.customer.state || '',
        country: data.customer.country || '',
        zipCode: data.customer.zipCode || '',
        taxId: data.customer.taxId || '',
        creditLimit: data.customer.creditLimit || '0.00',
        isActive: data.customer.isActive !== false
      })
      setFormErrors({})
      setShowEditModal(true)
    } catch (err) {
      setError(err.message || 'Failed to fetch customer details')
    }
  }

  const handleDeleteClick = (customer) => {
    setSelectedCustomer(customer)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteCustomer(selectedCustomer.id)
      setSuccessMessage('Customer deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      setSelectedCustomer(null)
      loadCustomers()
    } catch (err) {
      setError(err.message || 'Failed to delete customer')
      setShowDeleteModal(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    if (formData.creditLimit && isNaN(parseFloat(formData.creditLimit))) {
      errors.creditLimit = 'Credit limit must be a valid number'
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
      // Prepare data
      const customerData = {
        ...formData,
        creditLimit: parseFloat(formData.creditLimit) || 0
      }

      if (showEditModal) {
        await updateCustomer(selectedCustomer.id, customerData)
        setSuccessMessage('Customer updated successfully')
      } else {
        await createCustomer(customerData)
        setSuccessMessage('Customer created successfully')
      }

      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCreateModal(false)
      setShowEditModal(false)
      setSelectedCustomer(null)
      loadCustomers()
    } catch (err) {
      setError(err.message || 'Failed to save customer')
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleStatusToggle = async (customer) => {
    try {
      await updateCustomer(customer.id, {
        isActive: !customer.isActive
      })
      setSuccessMessage(`Customer ${customer.isActive ? 'deactivated' : 'activated'} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
      loadCustomers()
    } catch (err) {
      setError(err.message || 'Failed to update customer status')
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page on search
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1) // Reset to first page on filter change
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

  return (
    <div className="customers-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Customers</h1>
          <p className="page-description">Manage your customer database</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateCustomer}>
          <span className="btn-icon">➕</span>
          Add Customer
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

      <div className="customers-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="customers-stats">
        <div className="stat-card">
          <span className="stat-label">Total Customers</span>
          <span className="stat-value">{totalCustomers}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading customers...</div>
      ) : customers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">👥</span>
          <h3>No customers found</h3>
          <p>Get started by adding your first customer</p>
          <button className="btn btn-primary" onClick={handleCreateCustomer}>
            Add Customer
          </button>
        </div>
      ) : (
        <>
          <div className="customers-table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>City</th>
                  <th>Balance</th>
                  <th>Credit Limit</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id}>
                    <td className="customer-name">
                      <div className="name-cell">
                        <span className="name">{customer.name}</span>
                        {customer.taxId && (
                          <span className="tax-id">Tax ID: {customer.taxId}</span>
                        )}
                      </div>
                    </td>
                    <td>{customer.email || '-'}</td>
                    <td>{customer.phone || '-'}</td>
                    <td>{customer.city || '-'}</td>
                    <td className="amount">{formatCurrency(customer.balance)}</td>
                    <td className="amount">{formatCurrency(customer.creditLimit)}</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={customer.isActive}
                          onChange={() => handleStatusToggle(customer)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className={`status-badge ${customer.isActive ? 'active' : 'inactive'}`}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(customer.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action edit"
                          onClick={() => handleEditCustomer(customer)}
                          title="Edit customer"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon-action delete"
                          onClick={() => handleDeleteClick(customer)}
                          title="Delete customer"
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

      {/* Create/Edit Customer Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
        }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showEditModal ? 'Edit Customer' : 'Create New Customer'}</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleFormChange}
                    className={formErrors.name ? 'error' : ''}
                    required
                  />
                  {formErrors.name && (
                    <span className="error-message">{formErrors.name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className={formErrors.email ? 'error' : ''}
                  />
                  {formErrors.email && (
                    <span className="error-message">{formErrors.email}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="taxId">Tax ID</label>
                  <input
                    type="text"
                    id="taxId"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address">Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleFormChange}
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <input
                    type="text"
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="zipCode">Zip Code</label>
                  <input
                    type="text"
                    id="zipCode"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="creditLimit">Credit Limit</label>
                  <input
                    type="number"
                    id="creditLimit"
                    name="creditLimit"
                    value={formData.creditLimit}
                    onChange={handleFormChange}
                    step="0.01"
                    min="0"
                    className={formErrors.creditLimit ? 'error' : ''}
                  />
                  {formErrors.creditLimit && (
                    <span className="error-message">{formErrors.creditLimit}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleFormChange}
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {showEditModal ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Customer</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedCustomer?.name}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Customers