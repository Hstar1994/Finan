// API Configuration
const API_URL = 'http://localhost:3000/api';

// Get authentication token
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const currentUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

// Check if user is admin
if (currentUser.role !== 'admin') {
    alert('Access denied. Only administrators can manage users.');
    window.location.href = 'dashboard.html';
}

// Pagination
let currentPage = 1;
let totalPages = 1;

// Current user being deleted
let userToDelete = null;

// Load users on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update user info in navbar
    if (currentUser.firstName && currentUser.lastName) {
        document.getElementById('userInfo').textContent = 
            `${currentUser.firstName} ${currentUser.lastName} (${currentUser.role})`;
    }
    
    // Show admin-only links
    if (currentUser.role === 'admin') {
        const usersLink = document.getElementById('usersLink');
        if (usersLink) {
            usersLink.style.display = 'flex';
        }
        const auditLink = document.getElementById('auditLink');
        if (auditLink) {
            auditLink.style.display = 'flex';
        }
    }
    
    loadUsers();
    
    // Add event listeners
    document.getElementById('userForm').addEventListener('submit', handleSubmit);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadUsers();
    });
});

/**
 * Load users from API
 */
async function loadUsers(page = 1) {
    try {
        currentPage = page;
        const search = document.getElementById('searchInput').value;
        const role = document.getElementById('roleFilter').value;
        const isActive = document.getElementById('statusFilter').value;
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: 10,
        });
        
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        if (isActive) params.append('isActive', isActive);
        
        const response = await fetch(`${API_URL}/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            throw new Error('Failed to load users');
        }
        
        const data = await response.json();
        displayUsers(data.data);
        updatePagination(data.pagination);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users. Please try again.');
    }
}

/**
 * Display users in table
 */
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${user.role.toUpperCase()}</span></td>
            <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                <div class="actions">
                    <button class="btn btn-primary btn-sm" onclick="openEditModal('${user.id}')">Edit</button>
                    ${user.id !== currentUser.id ? `<button class="btn btn-danger btn-sm" onclick="openDeleteModal('${user.id}', '${user.firstName} ${user.lastName}')">Delete</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Update pagination controls
 */
function updatePagination(pagination) {
    totalPages = pagination.totalPages;
    const paginationDiv = document.getElementById('pagination');
    
    let html = `
        <button onclick="loadUsers(1)" ${currentPage === 1 ? 'disabled' : ''}>First</button>
        <button onclick="loadUsers(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
    `;
    
    // Show page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<button onclick="loadUsers(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
    }
    
    html += `
        <button onclick="loadUsers(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <button onclick="loadUsers(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
    `;
    
    paginationDiv.innerHTML = html;
}

/**
 * Open create user modal
 */
function openCreateModal() {
    document.getElementById('modalTitle').textContent = 'Create User';
    document.getElementById('userId').value = '';
    document.getElementById('userForm').reset();
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = true;
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('submitBtn').textContent = 'Create User';
    document.getElementById('userModal').classList.add('active');
}

/**
 * Open edit user modal
 */
async function openEditModal(userId) {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user');
        }
        
        const result = await response.json();
        const user = result.data;
        
        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('userId').value = user.id;
        document.getElementById('firstName').value = user.firstName;
        document.getElementById('lastName').value = user.lastName;
        document.getElementById('email').value = user.email;
        document.getElementById('role').value = user.role;
        document.getElementById('isActive').value = user.isActive.toString();
        document.getElementById('passwordGroup').style.display = 'none';
        document.getElementById('password').required = false;
        document.getElementById('statusGroup').style.display = 'block';
        document.getElementById('submitBtn').textContent = 'Update User';
        document.getElementById('userModal').classList.add('active');
    } catch (error) {
        console.error('Error loading user:', error);
        showError('Failed to load user details. Please try again.');
    }
}

/**
 * Handle form submission
 */
async function handleSubmit(e) {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const isEdit = !!userId;
    
    const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
        role: document.getElementById('role').value,
    };
    
    if (!isEdit) {
        data.password = document.getElementById('password').value;
    } else {
        data.isActive = document.getElementById('isActive').value === 'true';
    }
    
    try {
        const url = isEdit ? `${API_URL}/users/${userId}` : `${API_URL}/users`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Operation failed');
        }
        
        closeModal();
        loadUsers(currentPage);
        showSuccess(isEdit ? 'User updated successfully' : 'User created successfully');
    } catch (error) {
        console.error('Error saving user:', error);
        showError(error.message || 'Failed to save user. Please try again.');
    }
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(userId, userName) {
    userToDelete = userId;
    document.getElementById('deleteUserName').textContent = userName;
    document.getElementById('deleteModal').classList.add('active');
}

/**
 * Confirm and execute delete
 */
async function confirmDelete() {
    if (!userToDelete) return;
    
    try {
        const response = await fetch(`${API_URL}/users/${userToDelete}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Delete failed');
        }
        
        closeDeleteModal();
        loadUsers(currentPage);
        showSuccess('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        showError(error.message || 'Failed to delete user. Please try again.');
    }
}

/**
 * Close user modal
 */
function closeModal() {
    document.getElementById('userModal').classList.remove('active');
    document.getElementById('userForm').reset();
}

/**
 * Close delete modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    userToDelete = null;
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#dc3545';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/**
 * Show success message
 */
function showSuccess(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#28a745';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

/**
 * Logout function
 */
function logout() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = 'index.html';
}

/**
 * Toggle sidebar for mobile
 */
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

// Close sidebar when clicking outside
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
