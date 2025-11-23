// API Configuration
const API_URL = 'http://localhost:3000/api';

// Get form elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');
const demoBtns = document.querySelectorAll('.btn-demo');

// Demo credential buttons
demoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        const password = btn.getAttribute('data-password');
        emailInput.value = email;
        passwordInput.value = password;
        emailInput.focus();
    });
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Please enter both email and password');
        return;
    }
    
    await login(email, password);
});

// Login function
async function login(email, password) {
    try {
        // Show loading state
        loginBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        errorMessage.style.display = 'none';
        
        // Make API request
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Try localStorage first, fall back to sessionStorage if it fails
            try {
                localStorage.setItem('token', data.token);
                console.log('Token saved to localStorage');
            } catch (e) {
                console.warn('localStorage blocked, using sessionStorage:', e);
                sessionStorage.setItem('token', data.token);
            }
            
            // Get user profile
            const profileResponse = await fetch(`${API_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${data.token}`,
                },
            });
            
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                // Backend returns { user: {...} }, extract the user object
                const userData = profileData.user || profileData;
                
                try {
                    // Try localStorage first
                    localStorage.setItem('user', JSON.stringify(userData));
                    sessionStorage.setItem('justLoggedIn', 'true');
                    console.log('User data saved to localStorage');
                } catch (e) {
                    console.warn('localStorage blocked, using sessionStorage for user data:', e);
                    // Fall back to sessionStorage
                    sessionStorage.setItem('user', JSON.stringify(userData));
                    sessionStorage.setItem('justLoggedIn', 'true');
                }
                
                // Verify data was saved (check both storages)
                const savedToken = localStorage.getItem('token') || sessionStorage.getItem('token');
                const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
                
                if (!savedToken || !savedUser) {
                    throw new Error('Authentication data was not saved. Please use a regular browser (Chrome, Firefox, Edge) instead of VS Code Simple Browser.');
                }
                
                console.log('Login successful, user data:', userData);
                console.log('Redirecting to dashboard...');
                
                // Use replace to prevent back button from returning to login
                window.location.replace('dashboard.html');
            } else {
                throw new Error('Failed to fetch user profile');
            }
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        showError(error.message || 'An error occurred during login');
        
        // Reset button state
        loginBtn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Only check for existing login if user explicitly lands on login page
// Don't auto-redirect to avoid loops
