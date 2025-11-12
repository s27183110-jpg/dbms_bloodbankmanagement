// Common utility functions for the Blood Bank Management System

const API_BASE_URL = 'http://localhost:3000/api';

// Show notification
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  if (!notification) return;

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-orange-500',
    info: 'bg-blue-500'
  };

  notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-50`;
  notification.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Format date for input field (YYYY-MM-DD)
function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}

// Validate email
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone number (10 digits)
function validatePhone(phone) {
  const re = /^\d{10}$/;
  return re.test(phone.replace(/\D/g, ''));
}

// Generate random ID
function generateId(prefix, length = 6) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = prefix;
  for (let i = 0; i < length - prefix.length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Confirm dialog
function confirmDelete(message = 'Are you sure you want to delete this item?') {
  return confirm(message);
}

// Loading spinner
function showLoading() {
  const spinner = document.createElement('div');
  spinner.id = 'loading-spinner';
  spinner.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
}

function hideLoading() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}

// Fetch wrapper with error handling
async function fetchAPI(url, options = {}) {
  try {
    showLoading();
    const response = await fetch(API_BASE_URL + url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    showNotification(error.message, 'error');
    throw error;
  } finally {
    hideLoading();
  }
}

// Export functions for use in other files
window.app = {
  API_BASE_URL,
  showNotification,
  formatDate,
  formatDateForInput,
  validateEmail,
  validatePhone,
  generateId,
  confirmDelete,
  showLoading,
  hideLoading,
  fetchAPI
};