// Shared initialization for all pages
// Get user data from localStorage OR sessionStorage
let user = null;
let token = null;

try {
    token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    user = userStr ? JSON.parse(userStr) : null;
} catch (e) {
    console.error('Error reading auth data:', e);
}

// Check authentication
if (!token || !user) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('index.html');
    throw new Error('Not authenticated');
}

// Show admin-only links
if (user.role === 'admin') {
    const usersLink = document.getElementById('usersLink');
    if (usersLink) {
        usersLink.style.display = 'flex';
    }
    const auditLink = document.getElementById('auditLink');
    if (auditLink) {
        auditLink.style.display = 'flex';
    }
}

// Logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('index.html');
    });
}

// Sidebar toggle - make it globally accessible with persistence
window.toggleSidebar = function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
        // Save the state to localStorage
        const isActive = sidebar.classList.contains('active');
        localStorage.setItem('sidebarOpen', isActive);
    }
}

// Restore sidebar state on page load
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const sidebarOpen = localStorage.getItem('sidebarOpen');
    
    if (sidebar && sidebarOpen === 'true') {
        sidebar.classList.add('active');
    }
});

// Update user info in navbar
const userInfo = document.getElementById('userInfo');
if (userInfo && user) {
    userInfo.textContent = `${user.firstName} ${user.lastName} (${user.role})`;
}
