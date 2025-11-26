import React, { useState, useEffect } from 'react'
import { getItems } from '../utils/api'

const Items = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 })

  useEffect(() => {
    loadItems()
  }, [pagination.page])

  const loadItems = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getItems(pagination.page, pagination.limit)
      setItems(data.data || [])
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }))
    } catch (err) {
      setError(err.message || 'Failed to load items')
    } finally {
      setLoading(false)
    }
  }

  if (loading && items.length === 0) {
    return <div><h1>🏷️ Items</h1><p>Loading items...</p></div>
  }

  if (error) {
    return <div><h1>🏷️ Items</h1><p style={{ color: '#e74c3c' }}>Error: {error}</p></div>
  }

  return (
    <div>
      <h1>🏷️ Items</h1>
      <p>Total: {pagination.total} items</p>
      
      <table style={{ width: '100%', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '1rem' }}>
        <thead style={{ background: '#34495e', color: 'white' }}>
          <tr>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Price</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Category</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ padding: '1rem' }}>{item.name}</td>
              <td style={{ padding: '1rem' }}>{item.description || '-'}</td>
              <td style={{ padding: '1rem' }}>${parseFloat(item.price).toFixed(2)}</td>
              <td style={{ padding: '1rem' }}>{item.category || '-'}</td>
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

export default Items
