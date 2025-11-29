import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getUsers, createUser, updateUser, deleteUser } from '../utils/api'
import './Users.css'

const Users = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user',
    isActive: true
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      loadUsers()
    } else {
      setLoading(false)
    }
  }, [pagination.page, currentUser, searchTerm, roleFilter, statusFilter])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const filters = {}
      if (searchTerm) filters.search = searchTerm
      if (roleFilter) filters.role = roleFilter
      if (statusFilter) filters.isActive = statusFilter
      
      const data = await getUsers(pagination.page, pagination.limit, filters)
      setUsers(data.data || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
    } catch (err) {
      setError(err.message || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = () => {
    setModalMode('create')
    setSelectedUser(null)
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'user',
      isActive: true
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleEditUser = (user) => {
    setModalMode('edit')
    setSelectedUser(user)
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      password: ''
    })
    setFormErrors({})
    setShowModal(true)
  }

  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    
    try {
      setLoading(true)
      await deleteUser(userToDelete.id)
      setSuccess(`User "${userToDelete.email}" deleted successfully`)
      setShowDeleteConfirm(false)
      setUserToDelete(null)
      loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to delete user')
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }
    
    if (modalMode === 'create' && !formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }
    
    if (!['admin', 'manager', 'user'].includes(formData.role)) {
      errors.role = 'Invalid role'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      setLoading(true)
      setError(null)
      
      const userData = {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        isActive: formData.isActive
      }
      
      if (modalMode === 'create') {
        userData.password = formData.password
        await createUser(userData)
        setSuccess('User created successfully')
      } else {
        if (formData.password) {
          userData.password = formData.password
        }
        await updateUser(selectedUser.id, userData)
        setSuccess('User updated successfully')
      }
      
      setShowModal(false)
      loadUsers()
    } catch (err) {
      setError(err.message || `Failed to ${modalMode} user`)
    } finally {
      setLoading(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleStatusToggle = async (user) => {
    if (user.id === currentUser.id) {
      setError('Cannot deactivate your own account')
      return
    }
    
    try {
      setLoading(true)
      await updateUser(user.id, { isActive: !user.isActive })
      setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully`)
      loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to update user status')
    } finally {
      setLoading(false)
    }
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="users-page">
        <h1>🔑 Users Management</h1>
        <div className="alert alert-warning">
          <strong>⚠️ Access Denied</strong>
          <p>This page is only accessible to administrators.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>🔑 Users Management</h1>
          <p className="page-subtitle">Manage user accounts and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateUser}>
          ➕ Create User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button className="alert-close" onClick={() => setError(null)}>×</button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          {success}
          <button className="alert-close" onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      <div className="filters-bar">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="filter-select">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="user">User</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {(searchTerm || roleFilter || statusFilter) && (
          <button className="btn btn-secondary" onClick={() => {
            setSearchTerm('')
            setRoleFilter('')
            setStatusFilter('')
          }}>
            Clear Filters
          </button>
        )}
      </div>

      {loading && users.length === 0 ? (
        <div className="loading">Loading users...</div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan="6" className="no-data">No users found</td></tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-info">
                          <strong>{user.firstName} {user.lastName}</strong>
                          {user.id === currentUser.id && <span className="badge badge-info">You</span>}
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`badge badge-${user.role}`}>
                          {user.role === 'admin' && '👑 '}
                          {user.role === 'manager' && '👔 '}
                          {user.role === 'user' && '👤 '}
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <label className="switch">
                          <input type="checkbox" checked={user.isActive} onChange={() => handleStatusToggle(user)} disabled={user.id === currentUser.id || loading} />
                          <span className="slider"></span>
                        </label>
                        <span className={`status-text ${user.isActive ? 'active' : 'inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEditUser(user)} title="Edit user">✏️ Edit</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteClick(user)} disabled={user.id === currentUser.id} title={user.id === currentUser.id ? 'Cannot delete yourself' : 'Delete user'}>🗑️ Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination.total > pagination.limit && (
            <div className="pagination">
              <button className="btn btn-secondary" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1 || loading}>← Previous</button>
              <span className="pagination-info">Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)} ({pagination.total} total users)</span>
              <button className="btn btn-secondary" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit) || loading}>Next →</button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'create' ? '➕ Create New User' : '✏️ Edit User'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">First Name *</label>
                    <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleFormChange} className={formErrors.firstName ? 'error' : ''} />
                    {formErrors.firstName && <span className="error-text">{formErrors.firstName}</span>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">Last Name *</label>
                    <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleFormChange} className={formErrors.lastName ? 'error' : ''} />
                    {formErrors.lastName && <span className="error-text">{formErrors.lastName}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleFormChange} className={formErrors.email ? 'error' : ''} />
                  {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password {modalMode === 'create' ? '*' : '(leave blank to keep current)'}</label>
                  <input type="password" id="password" name="password" value={formData.password} onChange={handleFormChange} className={formErrors.password ? 'error' : ''} placeholder={modalMode === 'edit' ? 'Leave blank to keep current password' : ''} />
                  {formErrors.password && <span className="error-text">{formErrors.password}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="role">Role *</label>
                    <select id="role" name="role" value={formData.role} onChange={handleFormChange} className={formErrors.role ? 'error' : ''} disabled={selectedUser?.id === currentUser.id}>
                      <option value="user">👤 User</option>
                      <option value="manager">👔 Manager</option>
                      <option value="admin">👑 Admin</option>
                    </select>
                    {formErrors.role && <span className="error-text">{formErrors.role}</span>}
                    {selectedUser?.id === currentUser.id && <small className="form-hint">Cannot change your own role</small>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="isActive">Status</label>
                    <label className="checkbox-label">
                      <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleFormChange} disabled={selectedUser?.id === currentUser.id} />
                      <span>Active</span>
                    </label>
                    {selectedUser?.id === currentUser.id && <small className="form-hint">Cannot deactivate your own account</small>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : modalMode === 'create' ? 'Create User' : 'Update User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && userToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Confirm Delete</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this user?</p>
              <div className="confirm-details">
                <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>
                <br />
                <small>{userToDelete.email}</small>
              </div>
              <p className="warning-text">⚠️ This action cannot be undone!</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={loading}>{loading ? 'Deleting...' : 'Delete User'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users