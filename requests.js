let allRequests = [];
let editingRequestId = null;

// Load all requests
async function loadRequests() {
  try {
    const response = await fetch('http://localhost:3000/api/requests');
    allRequests = await response.json();
    displayRequests(allRequests);
    updateStats();
  } catch (error) {
    console.error('Error loading requests:', error);
    showNotification('Error loading requests', 'error');
  }
}

// Update statistics
function updateStats() {
  const stats = {
    pending: 0,
    approved: 0,
    rejected: 0,
    fulfilled: 0
  };

  allRequests.forEach(request => {
    stats[request.status]++;
  });

  document.getElementById('stat-pending').textContent = stats.pending;
  document.getElementById('stat-approved').textContent = stats.approved;
  document.getElementById('stat-rejected').textContent = stats.rejected;
  document.getElementById('stat-fulfilled').textContent = stats.fulfilled;
}

// Display requests in table
function displayRequests(requests) {
  const tbody = document.getElementById('requests-tbody');
  tbody.innerHTML = '';

  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-gray-500">No requests found</td></tr>';
    return;
  }

  requests.forEach(request => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${request.request_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.patient_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.hospital_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${request.blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.units_needed}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(request.request_date)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(request.status)}">
          ${request.status.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        ${request.status === 'pending' ? `
          <button onclick="updateRequestStatus('${request.request_id}', 'approved')" class="text-green-600 hover:text-green-900">Approve</button>
          <button onclick="updateRequestStatus('${request.request_id}', 'rejected')" class="text-red-600 hover:text-red-900">Reject</button>
        ` : ''}
        <button onclick="deleteRequest('${request.request_id}')" class="text-red-600 hover:text-red-900">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Get status color
function getStatusColor(status) {
  const colors = {
    pending: 'bg-orange-100 text-orange-800',
    approved: 'bg-blue-100 text-blue-800',
    rejected: 'bg-red-100 text-red-800',
    fulfilled: 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Search and filter requests
function searchRequests() {
  filterRequests();
}

function filterRequests() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value.toLowerCase();
  const bloodGroupFilter = document.getElementById('blood-group-filter').value.toLowerCase();

  const filtered = allRequests.filter(request => {
    const matchesSearch = request.request_id.toLowerCase().includes(searchTerm) ||
                         request.patient_name.toLowerCase().includes(searchTerm);
    
    const matchesStatus = !statusFilter || request.status === statusFilter;
    const matchesBloodGroup = !bloodGroupFilter || request.blood_group === bloodGroupFilter;

    return matchesSearch && matchesStatus && matchesBloodGroup;
  });

  displayRequests(filtered);
}

// Open modal for adding request
function openAddRequestModal() {
  editingRequestId = null;
  document.getElementById('modal-title').textContent = 'New Blood Request';
  document.getElementById('request-form').reset();
  document.getElementById('request_id').disabled = false;
  
  // Set default request date to today
  document.getElementById('request_date').value = new Date().toISOString().split('T')[0];
  document.getElementById('status').value = 'pending';
  
  document.getElementById('request-modal').classList.remove('hidden');
}

// Save request (create or update)
async function saveRequest(event) {
  event.preventDefault();
  
  const requestData = {
    request_id: document.getElementById('request_id').value,
    patient_id: document.getElementById('patient_id').value,
    hospital_id: document.getElementById('hospital_id').value,
    blood_group: document.getElementById('blood_group').value,
    units_needed: parseInt(document.getElementById('units_needed').value),
    request_date: document.getElementById('request_date').value,
    status: document.getElementById('status').value
  };

  try {
    const url = 'http://localhost:3000/api/requests';
    const method = 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      closeModal();
      loadRequests();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error saving request:', error);
    showNotification('Error saving request', 'error');
  }
}

// Update request status
async function updateRequestStatus(requestId, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus} this request?`)) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadRequests();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error updating request:', error);
    showNotification('Error updating request', 'error');
  }
}

// Delete request
async function deleteRequest(requestId) {
  if (!confirm('Are you sure you want to delete this request?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/requests/${requestId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadRequests();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting request:', error);
    showNotification('Error deleting request', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('request-modal').classList.add('hidden');
}

// Initialize page
loadRequests();