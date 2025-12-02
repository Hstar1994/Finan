import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAuditLogs, getAuditLogById } from '../utils/api'
import './AuditLogs.css'

const AuditLogs = () => {
  const { user } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0 })
  
  // Filter state
  const [entityFilter, setEntityFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  
  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  
  // Alert state
  const [alert, setAlert] = useState({ show: false, type: '', message: '' })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs()
    } else {
      setLoading(false)
    }
  }, [pagination.page, entityFilter, actionFilter, user])

  const loadLogs = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (entityFilter) filters.entity = entityFilter
      if (actionFilter) filters.action = actionFilter
      
      const data = await getAuditLogs(pagination.page, pagination.limit, filters)
      setLogs(data.logs || [])
      if (data.pagination) {
        setPagination(prev => ({ 
          ...prev, 
          total: data.pagination.total,
          totalPages: data.pagination.totalPages 
        }))
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message })
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 5000)
  }

  const handleViewLog = async (log) => {
    try {
      const data = await getAuditLogById(log.id)
      setSelectedLog(data.log)
      setShowViewModal(true)
    } catch (err) {
      showAlert('error', err.message || 'Failed to load log details')
    }
  }

  const getActionIcon = (action) => {
    const icons = {
      CREATE: '➕',
      UPDATE: '✏️',
      DELETE: '🗑️',
      LOGIN: '🔓',
      LOGOUT: '🔒',
      VIEW: '👁️'
    }
    return icons[action] || '📝'
  }

  const getActionColor = (action) => {
    const colors = {
      CREATE: 'create',
      UPDATE: 'update',
      DELETE: 'delete',
      LOGIN: 'login',
      LOGOUT: 'logout',
      VIEW: 'view'
    }
    return colors[action] || 'default'
  }

  const getEntityIcon = (entity) => {
    const icons = {
      User: '👤',
      Customer: '👥',
      Item: '📦',
      Quote: '📋',
      Invoice: '📄',
      Receipt: '💰',
      CreditNote: '📃'
    }
    return icons[entity] || '📊'
  }

  if (user?.role !== 'admin') {
    return (
      <div className="audit-logs-page">
        <h1>📝 Audit Logs</h1>
        <div className="access-denied">
          <span className="denied-icon">⚠️</span>
          <h3>Access Denied</h3>
          <p>This page is only accessible to administrators.</p>
        </div>
      </div>
    )
  }

  if (loading && logs.length === 0) {
    return <div className="audit-logs-page"><div className="loading-spinner">⏳ Loading audit logs...</div></div>
  }

  return (
    <div className="audit-logs-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📝 Audit Logs</h1>
          <p className="page-description">System activity and security audit trail (Admin only)</p>
        </div>
      </div>

      {alert.show && (
        <div className={`alert alert-${alert.type}`}>
          <span className="alert-icon">{alert.type === 'success' ? '✓' : '⚠'}</span>
          {alert.message}
          <button className="alert-close" onClick={() => setAlert({ show: false, type: '', message: '' })}>×</button>
        </div>
      )}

      <div className="audit-controls">
        <div className="filters">
          <select 
            className="filter-select"
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
          >
            <option value="">All Entities</option>
            <option value="User">Users</option>
            <option value="Customer">Customers</option>
            <option value="Item">Items</option>
            <option value="Quote">Quotes</option>
            <option value="Invoice">Invoices</option>
            <option value="Receipt">Receipts</option>
            <option value="CreditNote">Credit Notes</option>
          </select>

          <select 
            className="filter-select"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="VIEW">View</option>
          </select>
        </div>
        <div className="logs-count">
          Total Logs: <strong>{pagination.total}</strong>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <h3>No audit logs found</h3>
          <p>Activity logs will appear here as system events occur</p>
        </div>
      ) : (
        <>
          <div className="audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>IP Address</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} onClick={() => handleViewLog(log)} className="clickable-row">
                    <td>
                      <div className="timestamp">
                        <div className="date">{new Date(log.createdAt).toLocaleDateString()}</div>
                        <div className="time">{new Date(log.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </td>
                    <td>
                      <div className="user-info">
                        <div className="user-name">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown'}
                        </div>
                        <div className="user-email">{log.user?.email || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <span className={`action-badge ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)} {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="entity-badge">
                        {getEntityIcon(log.entity)} {log.entity}
                      </span>
                    </td>
                    <td>
                      <span className="entity-id">{log.entityId ? log.entityId.substring(0, 8) + '...' : 'N/A'}</span>
                    </td>
                    <td>
                      <span className="ip-address">{log.ipAddress || 'N/A'}</span>
                    </td>
                    <td>
                      <button className="btn-view-details" title="View Details">
                        👁️
                      </button>
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

      {/* View Log Details Modal */}
      {showViewModal && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-dialog modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Audit Log Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="log-view">
                <div className="log-info-grid">
                  <div className="info-item">
                    <span className="label">Timestamp</span>
                    <span className="value">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Action</span>
                    <span className={`action-badge ${getActionColor(selectedLog.action)}`}>
                      {getActionIcon(selectedLog.action)} {selectedLog.action}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">User</span>
                    <span className="value">
                      {selectedLog.user ? `${selectedLog.user.firstName} ${selectedLog.user.lastName}` : 'Unknown'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">User Email</span>
                    <span className="value">{selectedLog.user?.email || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Entity Type</span>
                    <span className="entity-badge">
                      {getEntityIcon(selectedLog.entity)} {selectedLog.entity}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Entity ID</span>
                    <span className="value entity-id-full">{selectedLog.entityId || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">IP Address</span>
                    <span className="value">{selectedLog.ipAddress || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">User Agent</span>
                    <span className="value user-agent">{selectedLog.userAgent || 'N/A'}</span>
                  </div>
                </div>

                {selectedLog.changes && Object.keys(selectedLog.changes).length > 0 && (
                  <div className="log-changes">
                    <h4>Changes</h4>
                    <pre className="changes-code">{JSON.stringify(selectedLog.changes, null, 2)}</pre>
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
    </div>
  )
}

export default AuditLogs