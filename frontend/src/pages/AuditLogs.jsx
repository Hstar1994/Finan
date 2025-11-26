import React, { useState, useEffect } from 'react'
import { getAuditLogs } from '../utils/api'
import { useLayout } from '../contexts/LayoutContext'

const AuditLogs = () => {
  const { user } = useLayout()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    if (user?.role === 'admin') {
      loadLogs()
    } else {
      setLoading(false)
    }
  }, [pagination.page, user])

  const loadLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAuditLogs(pagination.page, pagination.limit)
      setLogs(data.data || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
    } catch (err) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div>
        <h1>📝 Audit Logs</h1>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
          <strong>⚠️ Access Denied</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>This page is only accessible to administrators.</p>
        </div>
      </div>
    )
  }

  if (loading && logs.length === 0) {
    return <div><h1>📝 Audit Logs</h1><p>Loading audit logs...</p></div>
  }

  if (error) {
    return <div><h1>📝 Audit Logs</h1><p style={{ color: '#e74c3c' }}>Error: {error}</p></div>
  }

  return (
    <div>
      <h1>📝 Audit Logs</h1>
      <p>Total: {pagination.total} logs</p>
      
      <table style={{ width: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
        <thead style={{ background: '#34495e', color: 'white' }}>
          <tr>
            <th style={{ padding: '1rem', textAlign: 'left' }}>User</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Action</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Entity</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Details</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '1rem' }}>{log.user_email}</td>
              <td style={{ padding: '1rem' }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px', 
                  background: log.action === 'CREATE' ? '#2ecc71' : log.action === 'UPDATE' ? '#3498db' : log.action === 'DELETE' ? '#e74c3c' : '#95a5a6',
                  color: 'white',
                  fontSize: '0.85rem'
                }}>
                  {log.action}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>{log.entity_type}</td>
              <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#7f8c8d' }}>{log.details || '-'}</td>
              <td style={{ padding: '1rem' }}>{new Date(log.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {pagination.total > pagination.limit && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            style={{ padding: '0.5rem 1rem', cursor: pagination.page === 1 ? 'not-allowed' : 'pointer' }}
          >
            Previous
          </button>
          <span style={{ padding: '0.5rem 1rem' }}>Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}</span>
          <button 
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            style={{ padding: '0.5rem 1rem', cursor: pagination.page >= Math.ceil(pagination.total / pagination.limit) ? 'not-allowed' : 'pointer' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default AuditLogs
