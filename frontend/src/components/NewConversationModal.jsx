import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { config } from '../config/env'
import './NewConversationModal.css'

const NewConversationModal = ({ onClose, onConversationCreated }) => {
  const { token, user } = useAuth()
  const [title, setTitle] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersResponse = await fetch(`${config.apiUrl}/users?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          const usersList = usersData.data?.users || usersData.data || []
          // Filter out current user from the list
          const filteredUsers = usersList.filter(u => u.id !== user?.id)
          setUsers(filteredUsers)
        } else {
          setError('Failed to load users')
        }
      } catch (err) {
        setError('Failed to load users')
      }
    }

    fetchUsers()
  }, [token, user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      if (selectedUsers.length === 0) {
        throw new Error('Please select at least one user')
      }

      const payload = {
        type: 'STAFF_GROUP',
        title: title || 'New Conversation',
        participantUserIds: selectedUsers
      }

      const response = await fetch(`${config.apiUrl}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create conversation')
      }

      const data = await response.json()
      onConversationCreated(data.data)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
      return newSelection
    })
  }

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💬 New Conversation</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Conversation Name */}
          <div className="form-group">
            <label>Conversation Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Sales Team, Project Discussion"
              className="form-control"
              autoFocus
            />
            <small style={{ color: '#666', fontSize: '12px' }}>Optional - defaults to "New Conversation"</small>
          </div>

          {/* Search Users */}
          <div className="form-group">
            <label>Search Users</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="form-control"
            />
          </div>

          {/* Selected Users Count */}
          {selectedUsers.length > 0 && (
            <div style={{ 
              padding: '8px 12px', 
              background: '#e3f2fd', 
              borderRadius: '4px', 
              marginBottom: '12px',
              fontSize: '14px',
              color: '#1976d2'
            }}>
              ✓ {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </div>
          )}

          {/* User Selection */}
          <div className="form-group">
            <label>Select Users to Add</label>
            <div className="user-list">
              {users.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                  No users found matching "{searchQuery}"
                </div>
              ) : (
                filteredUsers.map(user => (
                  <label key={user.id} className="user-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                    />
                    <div className="user-info">
                      <div className="user-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="user-details">
                        {user.email} • {user.role}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isLoading || selectedUsers.length === 0}>
              {isLoading ? 'Creating...' : 'Create Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewConversationModal
