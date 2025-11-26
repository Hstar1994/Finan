// API Configuration
const API_URL = 'http://localhost:3000/api';

// Get authentication token and user
const token = localStorage.getItem('token') || sessionStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');

// Check authentication
if (!token || !user.id) {
    window.location.href = 'index.html';
}

// Load profile on page load
document.addEventListener('DOMContentLoaded', () => {
    // Update user info in navbar
    if (user.firstName && user.lastName) {
        document.getElementById('userInfo').textContent = 
            `${user.firstName} ${user.lastName} (${user.role})`;
    }
    
    // Show Users link for admins
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
    
    loadProfile();
    
    // Add event listeners
    document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);
});

/**
 * Load user profile
 */
async function loadProfile() {
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (!response.ok) {
            throw new Error('Failed to load profile');
        }
        
        const data = await response.json();
        const userData = data.user || data;
        
        // Display account information
        document.getElementById('displayUserId').textContent = userData.id;
        document.getElementById('displayEmail').textContent = userData.email;
        
        const roleBadge = `<span class="role-badge role-${userData.role}">${userData.role.toUpperCase()}</span>`;
        document.getElementById('displayRole').innerHTML = roleBadge;
        
        document.getElementById('displayCreated').textContent = 
            new Date(userData.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        
        // Populate edit form
        document.getElementById('firstName').value = userData.firstName;
        document.getElementById('lastName').value = userData.lastName;
        document.getElementById('email').value = userData.email;
    } catch (error) {
        console.error('Error loading profile:', error);
        showError('Failed to load profile. Please try again.');
    }
}

/**
 * Handle profile update
 */
async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Update failed');
        }
        
        // Update stored user data
        const updatedUser = result.user;
        try {
            localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
            sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        showSuccess('Profile updated successfully!');
        
        // Reload profile to show updated data
        setTimeout(() => {
            loadProfile();
        }, 1000);
    } catch (error) {
        console.error('Error updating profile:', error);
        showError(error.message || 'Failed to update profile. Please try again.');
    }
}

/**
 * Handle password change
 */
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
        showError('New passwords do not match!');
        return;
    }
    
    // Validate password length
    if (newPassword.length < 6) {
        showError('Password must be at least 6 characters long!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
            }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Password change failed');
        }
        
        showSuccess('Password changed successfully!');
        clearPasswordForm();
    } catch (error) {
        console.error('Error changing password:', error);
        showError(error.message || 'Failed to change password. Please try again.');
    }
}

/**
 * Clear password form
 */
function clearPasswordForm() {
    document.getElementById('passwordForm').reset();
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.style.display = 'none';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 5000);
}

/**
 * Show error message
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    successDiv.style.display = 'none';
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
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
