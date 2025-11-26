import React, { useState, useEffect } from 'react'
import { getQuotes } from '../utils/api'

const Quotes = () => {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    loadQuotes()
  }, [pagination.page])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getQuotes(pagination.page, pagination.limit)
      setQuotes(data.data || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
    } catch (err) {
      setError(err.message || 'Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  if (loading && quotes.length === 0) {
    return <div><h1>📋 Quotes</h1><p>Loading quotes...</p></div>
  }

  if (error) {
    return <div><h1>📋 Quotes</h1><p style={{ color: '#e74c3c' }}>Error: {error}</p></div>
  }

  return (
    <div>
      <h1>📋 Quotes</h1>
      <p>Total: {pagination.total} quotes</p>
      
      <table style={{ width: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
        <thead style={{ background: '#34495e', color: 'white' }}>
          <tr>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Quote #</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Customer</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Amount</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '1rem' }}>#{quote.id}</td>
              <td style={{ padding: '1rem' }}>{quote.customer_name}</td>
              <td style={{ padding: '1rem' }}>
                <span style={{ 
                  padding: '0.25rem 0.5rem', 
                  borderRadius: '4px', 
                  background: quote.status === 'accepted' ? '#2ecc71' : quote.status === 'pending' ? '#f39c12' : '#95a5a6',
                  color: 'white',
                  fontSize: '0.85rem'
                }}>
                  {quote.status}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>${parseFloat(quote.total_amount).toFixed(2)}</td>
              <td style={{ padding: '1rem' }}>{new Date(quote.created_at).toLocaleDateString()}</td>
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

export default Quotes
