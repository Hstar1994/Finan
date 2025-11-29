import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getItems, getItemById, createItem, updateItem, deleteItem } from '../utils/api'
import './Items.css'

const Items = () => {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    unitPrice: '0.00',
    category: '',
    unit: 'unit',
    taxRate: '0.00',
    isActive: true
  })

  const [formErrors, setFormErrors] = useState({})

  // Common categories
  const categories = ['Product', 'Service', 'Material', 'Labor', 'Equipment', 'Other']
  const units = ['unit', 'hour', 'piece', 'kg', 'meter', 'liter', 'box']

  useEffect(() => {
    loadItems()
  }, [currentPage, searchTerm, categoryFilter, statusFilter])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters = {}
      if (searchTerm) filters.search = searchTerm
      if (categoryFilter !== 'all') filters.category = categoryFilter
      if (statusFilter !== 'all') filters.isActive = statusFilter === 'active'

      const data = await getItems(currentPage, 10, filters)
      
      setItems(data.items || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotalItems(data.pagination?.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load items')
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateItem = () => {
    setFormData({
      name: '',
      description: '',
      sku: '',
      unitPrice: '0.00',
      category: '',
      unit: 'unit',
      taxRate: '0.00',
      isActive: true
    })
    setFormErrors({})
    setShowCreateModal(true)
  }

  const handleEditItem = async (item) => {
    try {
      const data = await getItemById(item.id)
      setSelectedItem(data.item)
      setFormData({
        name: data.item.name || '',
        description: data.item.description || '',
        sku: data.item.sku || '',
        unitPrice: data.item.unitPrice || '0.00',
        category: data.item.category || '',
        unit: data.item.unit || 'unit',
        taxRate: data.item.taxRate || '0.00',
        isActive: data.item.isActive !== false
      })
      setFormErrors({})
      setShowEditModal(true)
    } catch (err) {
      setError(err.message || 'Failed to fetch item details')
    }
  }

  const handleDeleteClick = (item) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleConfirmDelete = async () => {
    try {
      await deleteItem(selectedItem.id)
      setSuccessMessage('Item deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      setShowDeleteModal(false)
      setSelectedItem(null)
      loadItems()
    } catch (err) {
      setError(err.message || 'Failed to delete item')
      setShowDeleteModal(false)
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) {
      errors.name = 'Name is required'
    }

    if (!formData.unitPrice || isNaN(parseFloat(formData.unitPrice)) || parseFloat(formData.unitPrice) < 0) {
      errors.unitPrice = 'Unit price must be a valid positive number'
    }

    if (formData.taxRate && (isNaN(parseFloat(formData.taxRate)) || parseFloat(formData.taxRate) < 0 || parseFloat(formData.taxRate) > 100)) {
      errors.taxRate = 'Tax rate must be between 0 and 100'
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
      const itemData = {
        ...formData,
        unitPrice: parseFloat(formData.unitPrice) || 0,
        taxRate: parseFloat(formData.taxRate) || 0
      }

      if (showEditModal) {
        await updateItem(selectedItem.id, itemData)
        setSuccessMessage('Item updated successfully')
      } else {
        await createItem(itemData)
        setSuccessMessage('Item created successfully')
      }

      setTimeout(() => setSuccessMessage(''), 3000)
      setShowCreateModal(false)
      setShowEditModal(false)
      setSelectedItem(null)
      loadItems()
    } catch (err) {
      setError(err.message || 'Failed to save item')
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleStatusToggle = async (item) => {
    try {
      await updateItem(item.id, {
        isActive: !item.isActive
      })
      setSuccessMessage(`Item ${item.isActive ? 'deactivated' : 'activated'} successfully`)
      setTimeout(() => setSuccessMessage(''), 3000)
      loadItems()
    } catch (err) {
      setError(err.message || 'Failed to update item status')
    }
  }

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleCategoryFilterChange = (e) => {
    setCategoryFilter(e.target.value)
    setCurrentPage(1)
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

  return (
    <div className="items-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Items</h1>
          <p className="page-description">Manage your product and service catalog</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateItem}>
          <span className="btn-icon">➕</span>
          Add Item
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

      <div className="items-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, description, or SKU..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select
            value={categoryFilter}
            onChange={handleCategoryFilterChange}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

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

      <div className="items-stats">
        <div className="stat-card">
          <span className="stat-label">Total Items</span>
          <span className="stat-value">{totalItems}</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🏷️</span>
          <h3>No items found</h3>
          <p>Get started by adding your first item</p>
          <button className="btn btn-primary" onClick={handleCreateItem}>
            Add Item
          </button>
        </div>
      ) : (
        <>
          <div className="items-table-container">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Unit Price</th>
                  <th>Unit</th>
                  <th>Tax Rate</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="item-name">
                      <div className="name-cell">
                        <span className="name">{item.name}</span>
                        {item.description && (
                          <span className="description">{item.description}</span>
                        )}
                      </div>
                    </td>
                    <td>{item.sku || '-'}</td>
                    <td>
                      {item.category && (
                        <span className="category-badge">{item.category}</span>
                      )}
                    </td>
                    <td className="amount">{formatCurrency(item.unitPrice)}</td>
                    <td>{item.unit}</td>
                    <td>{parseFloat(item.taxRate || 0).toFixed(2)}%</td>
                    <td>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={item.isActive}
                          onChange={() => handleStatusToggle(item)}
                        />
                        <span className="slider"></span>
                      </label>
                      <span className={`status-badge ${item.isActive ? 'active' : 'inactive'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon-action edit"
                          onClick={() => handleEditItem(item)}
                          title="Edit item"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon-action delete"
                          onClick={() => handleDeleteClick(item)}
                          title="Delete item"
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

      {/* Create/Edit Item Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false)
          setShowEditModal(false)
        }}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showEditModal ? 'Edit Item' : 'Create New Item'}</h2>
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
                  <label htmlFor="sku">SKU</label>
                  <input
                    type="text"
                    id="sku"
                    name="sku"
                    value={formData.sku}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="2"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleFormChange}
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="unit">Unit</label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleFormChange}
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="unitPrice">
                    Unit Price <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="unitPrice"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleFormChange}
                    step="0.01"
                    min="0"
                    className={formErrors.unitPrice ? 'error' : ''}
                    required
                  />
                  {formErrors.unitPrice && (
                    <span className="error-message">{formErrors.unitPrice}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="taxRate">Tax Rate (%)</label>
                  <input
                    type="number"
                    id="taxRate"
                    name="taxRate"
                    value={formData.taxRate}
                    onChange={handleFormChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className={formErrors.taxRate ? 'error' : ''}
                  />
                  {formErrors.taxRate && (
                    <span className="error-message">{formErrors.taxRate}</span>
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
                  {showEditModal ? 'Update Item' : 'Create Item'}
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
              <h2>Delete Item</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>{selectedItem?.name}</strong>?</p>
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
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Items
