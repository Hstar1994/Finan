import React, { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { useLayout } from '../contexts/LayoutContext'
import { getMenuForRole } from '../config/menuConfig'
import './Sidebar.css'

const Sidebar = () => {
  const { isSidebarOpen, closeSidebar, user } = useLayout()
  const menuItems = getMenuForRole(user?.role || 'user')
  const sidebarRef = useRef(null)
  const hasRendered = useRef(false)

  useEffect(() => {
    // Mark that component has rendered at least once
    if (!hasRendered.current) {
      hasRendered.current = true
      return
    }
    
    // Add transitioning class for smooth animations after first render
    const sidebar = sidebarRef.current
    if (sidebar) {
      sidebar.classList.add('transitioning')
      
      // Remove transitioning class after animation completes
      const handleTransitionEnd = () => {
        sidebar.classList.remove('transitioning')
      }
      
      sidebar.addEventListener('transitionend', handleTransitionEnd)
      
      return () => {
        sidebar.removeEventListener('transitionend', handleTransitionEnd)
      }
    }
  }, [isSidebarOpen])

  return (
    <>
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}
      <aside 
        ref={sidebarRef}
        className={`sidebar ${isSidebarOpen ? 'open' : ''}`}
      >
        <nav className="sidebar-nav">
          <div className="sidebar-header">
            <h2>Navigation</h2>
            <span className="role-badge">{user?.role}</span>
          </div>
          <ul className="menu-list">
            {menuItems.map(item => (
              <li key={item.id}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
                  onClick={closeSidebar}
                >
                  <span className="menu-icon">{item.icon}</span>
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  )
}

export default Sidebar