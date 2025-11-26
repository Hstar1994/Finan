import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import './Layout.css'

const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Header />
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout