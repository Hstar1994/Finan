import React from 'react'
import { useLayout } from '../contexts/LayoutContext'
import './Header.css'

const Header = () => {
  const { toggleSidebar, user } = useLayout()

  const handleLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    window.location.href = '/index-vanilla.html'
  }

  return (
    <header className="app-header">
      <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <span className="hamburger-icon"></span>
      </button>
      <div className="header-title">
        <h1>Finan</h1>
      </div>
      <div className="header-user">
        <span className="user-name">{user?.name || 'User'}</span>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header