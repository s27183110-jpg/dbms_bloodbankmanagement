// Authentication utilities

// Handle login
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('login-btn');

  // Disable button during login
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    showLoading();
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      showNotification('Login successful! Redirecting...', 'success');
      
      // Redirect to hospital dashboard
      setTimeout(() => {
        window.location.href = 'hospital-dashboard.html';
      }, 1000);
    } else {
      // Show specific error message
      let errorMsg = 'Login failed. Please try again.';
      
      if (response.status === 401) {
        errorMsg = 'Invalid username or password';
      } else if (response.status === 500) {
        errorMsg = 'Server error. Please contact administrator';
      }
      
      showNotification(errorMsg, 'error');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  } catch (error) {
    console.error('Login error:', error);
    showNotification('Connection error. Please check if the server is running.', 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  } finally {
    hideLoading();
  }
}

// Handle logout
function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showNotification('Logged out successfully', 'info');
  setTimeout(() => {
    window.location.href = 'hospital-login.html';
  }, 1000);
}

// Check if user is authenticated
function isAuthenticated() {
  const token = localStorage.getItem('token');
  return token !== null;
}

// Get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Get authentication token
function getAuthToken() {
  return localStorage.getItem('token');
}

// Make authenticated API request
async function fetchAuthenticated(url, options = {}) {
  const token = getAuthToken();
  
  if (!token) {
    window.location.href = 'hospital-login.html';
    return;
  }

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, mergedOptions);
    
    // If unauthorized, redirect to login
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      showNotification('Session expired. Please login again.', 'warning');
      setTimeout(() => {
        window.location.href = 'hospital-login.html';
      }, 1500);
      return;
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Protect page - redirect to login if not authenticated
function protectPage() {
  if (!isAuthenticated()) {
    window.location.href = 'hospital-login.html';
  }
}

// Initialize authentication check on protected pages
if (window.location.pathname.includes('hospital-dashboard')) {
  protectPage();
}