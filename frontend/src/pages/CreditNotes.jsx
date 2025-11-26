import React, { useState, useEffect } from 'react'
import { getCreditNotes } from '../utils/api'

const CreditNotes = () => {
  const [creditNotes, setCreditNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    loadCreditNotes()
  }, [pagination.page])

  const loadCreditNotes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getCreditNotes(pagination.page, pagination.limit)
      setCreditNotes(data.data || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
    } catch (err) {
      setError(err.message || 'Failed to load credit notes')
    } finally {
      setLoading(false)
    }
  }

  if (loading && creditNotes.length === 0) {
    return <div><h1>🔄 Credit Notes</h1><p>Loading credit notes...</p></div>
  }

  if (error) {
    return <div><h1>🔄 Credit Notes</h1><p style={{ color: '#e74c3c' }}>Error: {error}</p></div>
  }

  return (
    <div>
      <h1>🔄 Credit Notes</h1>
      <p>Total: {pagination.total} credit notes</p>
      
      <table style={{ width: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
        <thead style={{ background: '#34495e', color: 'white' }}>
          <tr>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Credit Note #</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Invoice</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Amount</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Reason</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {creditNotes.map((note) => (
            <tr key={note.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '1rem' }}>#{note.id}</td>
              <td style={{ padding: '1rem' }}>Invoice #{note.invoice_id}</td>
              <td style={{ padding: '1rem' }}>${parseFloat(note.amount).toFixed(2)}</td>
              <td style={{ padding: '1rem' }}>{note.reason || '-'}</td>
              <td style={{ padding: '1rem' }}>{new Date(note.created_at).toLocaleDateString()}</td>
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

export default CreditNotes
