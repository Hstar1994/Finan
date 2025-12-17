import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import config from '../config/env'
import './NewConversationModal.css'

const NewConversationModal = ({ onClose, onConversationCreated }) => {
  const { token } = useAuth()
  const [conversationType, setConversationType] = useState('STAFF_GROUP')
  const [title, setTitle] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [users, setUsers] = useState([])
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load users and customers
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersResponse = await fetch(`${config.apiUrl}/users?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.data.users || [])
        }

        // Fetch customers
        const customersResponse = await fetch(`${config.apiUrl}/customers?limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (customersResponse.ok) {
          const customersData = await customersResponse.json()
          setCustomers(customersData.data.customers || [])
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      }
    }

    fetchData()
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      let payload = { type: conversationType }

      if (conversationType === 'STAFF_GROUP') {
        if (selectedUsers.length < 2) {
          throw new Error('Please select at least 2 users for a group conversation')
        }
        payload.title = title || 'Staff Group'
        payload.participantUserIds = selectedUsers
      } else if (conversationType === 'STAFF_DIRECT') {
        if (selectedUsers.length !== 1) {
          throw new Error('Please select exactly 1 user for a direct conversation')
        }
        payload.participantUserIds = selectedUsers
      } else if (conversationType === 'CUSTOMER_SUPPORT') {
        if (!selectedCustomer) {
          throw new Error('Please select a customer')
        }
        payload.customerId = selectedCustomer
        payload.participantUserIds = selectedUsers // Optional: add staff to the conversation
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
      console.error('Error creating conversation:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Conversation</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Conversation Type */}
          <div className="form-group">
            <label>Conversation Type</label>
            <select
              value={conversationType}
              onChange={(e) => {
                setConversationType(e.target.value)
                setSelectedUsers([])
                setSelectedCustomer(null)
                setTitle('')
              }}
              className="form-control"
            >
              <option value="STAFF_GROUP">Staff Group</option>
              <option value="STAFF_DIRECT">Direct Message (Staff)</option>
              <option value="CUSTOMER_SUPPORT">Customer Support</option>
            </select>
          </div>

          {/* Title (for group chats) */}
          {conversationType === 'STAFF_GROUP' && (
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sales Team, Management"
                className="form-control"
              />
            </div>
          )}

          {/* Customer Selection */}
          {conversationType === 'CUSTOMER_SUPPORT' && (
            <div className="form-group">
              <label>Select Customer *</label>
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="form-control"
                required
              >
                <option value="">-- Select a customer --</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* User Selection */}
          <div className="form-group">
            <label>
              {conversationType === 'STAFF_DIRECT' && 'Select User *'}
              {conversationType === 'STAFF_GROUP' && 'Select Users * (minimum 2)'}
              {conversationType === 'CUSTOMER_SUPPORT' && 'Add Staff Members (optional)'}
            </label>
            <div className="user-list">
              {users.map(user => (
                <label key={user.id} className="user-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    disabled={
                      conversationType === 'STAFF_DIRECT' &&
                      selectedUsers.length === 1 &&
                      !selectedUsers.includes(user.id)
                    }
                  />
                  <span>
                    {user.firstName} {user.lastName} ({user.email}) - {user.role}
                  </span>
                </label>
              ))}
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
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Conversation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewConversationModal
