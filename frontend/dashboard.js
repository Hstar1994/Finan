// API Configuration
const API_URL = 'http://localhost:3000/api';

// Prevent redirect loops - check if we just came from login
const justLoggedIn = sessionStorage.getItem('justLoggedIn');

// Get user data from localStorage OR sessionStorage (fallback for VS Code Simple Browser)
let user = null;
let token = null;

try {
    // Try localStorage first, then sessionStorage
    token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    user = userStr ? JSON.parse(userStr) : null;
    
    console.log('Auth check:', { 
        hasToken: !!token, 
        hasUser: !!user, 
        userId: user?.id,
        userObject: user,
        justLoggedIn: !!justLoggedIn 
    });
} catch (e) {
    console.error('Error reading auth data:', e);
}

// Check authentication
if (!token || !user) {
    // Missing token or user entirely
    if (justLoggedIn) {
        // Just logged in but data not ready - wait a moment and retry
        sessionStorage.removeItem('justLoggedIn');
        console.log('Auth data not ready, reloading...');
        setTimeout(() => {
            window.location.reload();
        }, 300);
        throw new Error('Loading...');
    } else {
        // Not logged in, redirect to login
        console.log('Not authenticated, redirecting to login');
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('index.html');
        throw new Error('Not authenticated');
    }
} else if (!user.id) {
    // Have user object but missing ID - this is a data corruption issue
    console.error('User object is missing ID:', user);
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('index.html');
    throw new Error('Invalid user data');
}

// Successfully authenticated, clear the flag
if (justLoggedIn) {
    sessionStorage.removeItem('justLoggedIn');
    console.log('Login successful, flag cleared');
}

// Role-based permissions
const permissions = {
    admin: {
        customers: { create: true, read: true, update: true, delete: true },
        items: { create: true, read: true, update: true, delete: true },
        invoices: { create: true, read: true, update: true, delete: true },
        quotes: { create: true, read: true, update: true, delete: true },
        receipts: { create: true, read: true, update: true, delete: true },
        creditNotes: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        audit: { read: true },
    },
    manager: {
        customers: { create: true, read: true, update: true, delete: false },
        items: { create: true, read: true, update: true, delete: false },
        invoices: { create: true, read: true, update: true, delete: false },
        quotes: { create: true, read: true, update: true, delete: false },
        receipts: { create: true, read: true, update: true, delete: false },
        creditNotes: { create: true, read: true, update: true, delete: false },
        users: { create: false, read: false, update: false, delete: false },
        audit: { read: true },
    },
    user: {
        customers: { create: false, read: true, update: false, delete: false },
        items: { create: false, read: true, update: false, delete: false },
        invoices: { create: false, read: true, update: false, delete: false },
        quotes: { create: false, read: true, update: false, delete: false },
        receipts: { create: false, read: true, update: false, delete: false },
        creditNotes: { create: false, read: true, update: false, delete: false },
        users: { create: false, read: false, update: false, delete: false },
        audit: { read: false },
    },
};

// Initialize dashboard
function initDashboard() {
    // Update user info in navbar
    document.getElementById('userInfo').textContent = 
        `${user.firstName} ${user.lastName} (${user.role})`;
    
    // Show Users link for admins only
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
    
    // Update user status card
    document.getElementById('userId').textContent = user.id;
    document.getElementById('userName').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('userEmail').textContent = user.email;
    
    const roleElement = document.getElementById('userRole');
    roleElement.textContent = user.role.toUpperCase();
    roleElement.classList.add('role-badge', user.role);
    
    const statusElement = document.getElementById('userStatus');
    statusElement.textContent = user.isActive ? 'Active' : 'Inactive';
    statusElement.classList.add('status-badge', user.isActive ? 'active' : 'inactive');
    
    document.getElementById('loginTime').textContent = new Date().toLocaleString();
    
    // Display permissions
    displayPermissions();
}

// Display user permissions
function displayPermissions() {
    const permissionsGrid = document.getElementById('permissionsGrid');
    const userPermissions = permissions[user.role] || permissions.user;
    
    const permissionsList = [
        { name: 'Customers', key: 'customers' },
        { name: 'Items', key: 'items' },
        { name: 'Invoices', key: 'invoices' },
        { name: 'Quotes', key: 'quotes' },
        { name: 'Receipts', key: 'receipts' },
        { name: 'Credit Notes', key: 'creditNotes' },
        { name: 'Users', key: 'users' },
        { name: 'Audit Logs', key: 'audit' },
    ];
    
    permissionsList.forEach(item => {
        const perms = userPermissions[item.key];
        const actions = [];
        
        if (perms.create) actions.push('Create');
        if (perms.read) actions.push('Read');
        if (perms.update) actions.push('Update');
        if (perms.delete) actions.push('Delete');
        
        const hasAnyPermission = actions.length > 0;
        const permText = hasAnyPermission ? actions.join(', ') : 'No Access';
        
        const permElement = document.createElement('div');
        permElement.className = `permission-item ${hasAnyPermission ? 'granted' : 'denied'}`;
        permElement.innerHTML = `
            <span>${hasAnyPermission ? '✓' : '✗'}</span>
            <span><strong>${item.name}:</strong> ${permText}</span>
        `;
        
        permissionsGrid.appendChild(permElement);
    });
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = 'index.html';
    }
});

// Fetch and display stats (placeholder)
async function fetchStats() {
    try {
        // These would be real API calls in a full implementation
        // For now, we'll just show placeholders
        
        // Example: Fetch customers count
        const customersResponse = await fetch(`${API_URL}/customers`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (customersResponse.ok) {
            const customers = await customersResponse.json();
            document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = 
                Array.isArray(customers) ? customers.length : '0';
        }
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
}

// Handle menu item clicks (placeholder for future implementation)
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
        const href = item.getAttribute('href');
        
        // Only prevent default for # links (placeholders)
        // Allow actual page links like users.html to work normally
        if (href === '#') {
            e.preventDefault();
            
            // Remove active class from all items
            document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
        }
        // For real links, let them navigate normally
        
        // Here you would normally load the content for that section
        // For now, just show an alert
        const section = item.querySelector('span:last-child').textContent;
        console.log(`Navigating to ${section}...`);
    });
});

// Initialize dashboard on page load
initDashboard();
fetchStats();

// Verify token is still valid periodically
setInterval(async () => {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            alert('Your session has expired. Please login again.');
            localStorage.clear();
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Token validation error:', error);
    }
}, 300000); // Check every 5 minutes

/**
 * Toggle sidebar for mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburgerBtn');
    
    if (sidebar && hamburger && 
        !sidebar.contains(e.target) && 
        !hamburger.contains(e.target) && 
        sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});
