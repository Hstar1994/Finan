import React from 'react'
import { useLayout } from '../contexts/LayoutContext'
import { useAuth } from '../contexts/AuthContext'
import './Header.css'

const Header = () => {
  const { toggleSidebar } = useLayout()
  const { user, logout } = useAuth()

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  return (
    <header className="app-header">
      <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <span className="hamburger-icon"></span>
      </button>
      <div className="header-title">
        <h1>💰 Finan</h1>
      </div>
      <div className="header-user">
        <span className="user-role" title="User role">
          {user?.role === 'admin' && '👑'}
          {user?.role === 'manager' && '👔'}
          {user?.role === 'user' && '👤'}
        </span>
        <span className="user-name">{getUserDisplayName()}</span>
        <button className="logout-btn" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header