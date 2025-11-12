let currentUser = null;
let warningsInterval = null;

// Initialize dashboard
async function initDashboard() {
  currentUser = getCurrentUser();
  
  if (!currentUser) {
    window.location.href = 'hospital-login.html';
    return;
  }

  // Display hospital name
  document.getElementById('hospital-name').textContent = currentUser.hospital_name;

  // Load all data
  await Promise.all([
    loadStatistics(),
    loadWarnings(),
    loadPendingRequests(),
    loadPatients(),
    loadBloodAvailability()
  ]);

  // Refresh warnings every 30 seconds
  warningsInterval = setInterval(loadWarnings, 30000);
}

// Load hospital statistics
async function loadStatistics() {
  try {
    const stats = await fetchAuthenticated('http://localhost:3000/api/hospital/statistics');
    
    document.getElementById('stat-pending').textContent = stats.pending_requests || 0;
    document.getElementById('stat-fulfilled').textContent = stats.fulfilled_requests || 0;
    document.getElementById('stat-patients').textContent = stats.unique_patients || 0;
    document.getElementById('stat-rate').textContent = stats.fulfillment_rate_percentage 
      ? stats.fulfillment_rate_percentage + '%' 
      : '0%';
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// Load warnings
async function loadWarnings() {
  try {
    const warnings = await fetchAuthenticated(
      `http://localhost:3000/api/warnings?hospital_id=${currentUser.hospital_id}&is_read=false&limit=20`
    );
    
    displayWarnings(warnings);
    
    // Update badge
    const badge = document.getElementById('warning-badge');
    if (warnings.length > 0) {
      badge.textContent = warnings.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error loading warnings:', error);
  }
}

// Display warnings
function displayWarnings(warnings) {
  const container = document.getElementById('warnings-list');
  container.innerHTML = '';

  if (warnings.length === 0) {
    container.innerHTML = '<div class="p-4 text-center text-gray-500">No new warnings</div>';
    return;
  }

  warnings.forEach(warning => {
    const div = document.createElement('div');
    div.className = 'p-4 hover:bg-gray-50 cursor-pointer';
    div.onclick = () => markWarningRead(warning.warning_id);
    
    const severityColors = {
      error: 'text-red-600',
      warning: 'text-orange-600',
      info: 'text-blue-600'
    };

    div.innerHTML = `
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${warning.severity === 'error' ? 
            '<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>' :
            warning.severity === 'warning' ?
            '<svg class="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>' :
            '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
          }
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium ${severityColors[warning.severity]}">${warning.warning_type.replace(/_/g, ' ').toUpperCase()}</p>
          <p class="text-sm text-gray-600 mt-1">${warning.message}</p>
          <p class="text-xs text-gray-400 mt-1">${formatDate(warning.created_at)}</p>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Toggle warnings dropdown
function toggleWarnings() {
  const dropdown = document.getElementById('warnings-dropdown');
  dropdown.classList.toggle('hidden');
}

// Mark warning as read
async function markWarningRead(warningId) {
  try {
    await fetchAuthenticated(`http://localhost:3000/api/warnings/${warningId}/read`, {
      method: 'PUT'
    });
    loadWarnings();
  } catch (error) {
    console.error('Error marking warning as read:', error);
  }
}

// Mark all warnings as read
async function markAllWarningsRead() {
  try {
    await fetchAuthenticated('http://localhost:3000/api/warnings/read-all', {
      method: 'PUT',
      body: JSON.stringify({ hospital_id: currentUser.hospital_id })
    });
    loadWarnings();
    showNotification('All warnings marked as read', 'success');
  } catch (error) {
    console.error('Error marking warnings as read:', error);
  }
}

// Load pending requests
async function loadPendingRequests() {
  try {
    const requests = await fetchAuthenticated('http://localhost:3000/api/hospital/pending');
    displayPendingRequests(requests);
  } catch (error) {
    console.error('Error loading pending requests:', error);
  }
}

// Display pending requests
function displayPendingRequests(requests) {
  const tbody = document.getElementById('requests-tbody');
  tbody.innerHTML = '';

  if (requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No pending requests</td></tr>';
    return;
  }

  requests.forEach(request => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    const priorityColors = {
      URGENT: 'bg-red-100 text-red-800',
      NORMAL: 'bg-yellow-100 text-yellow-800',
      PROCESSED: 'bg-green-100 text-green-800'
    };

    const availabilityColor = request.available_units >= request.units_needed 
      ? 'text-green-600' 
      : request.available_units > 0 
      ? 'text-orange-600' 
      : 'text-red-600';

    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${request.request_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.patient_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${request.requested_blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${request.units_needed}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(request.request_date)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${priorityColors[request.priority_level]}">
          ${request.priority_level}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${availabilityColor}">
        ${request.available_units} units
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Load patients
async function loadPatients() {
  try {
    const patients = await fetchAuthenticated('http://localhost:3000/api/hospital/patients');
    displayPatients(patients);
  } catch (error) {
    console.error('Error loading patients:', error);
  }
}

// Display patients
function displayPatients(patients) {
  const tbody = document.getElementById('patients-tbody');
  tbody.innerHTML = '';

  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No patients found</td></tr>';
    return;
  }

  patients.forEach(patient => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${patient.patient_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.patient_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${patient.blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.age || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.medical_condition || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${patient.total_requests} (${patient.fulfilled_requests} fulfilled)
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(patient.last_request_date)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Load blood availability
async function loadBloodAvailability() {
  try {
    const availability = await fetchAuthenticated('http://localhost:3000/api/hospital/blood-availability');
    displayBloodAvailability(availability);
    createAvailabilityChart(availability);
  } catch (error) {
    console.error('Error loading blood availability:', error);
  }
}

// Display blood availability alerts
function displayBloodAvailability(availability) {
  const container = document.getElementById('availability-alerts');
  container.innerHTML = '';

  const insufficient = availability.filter(a => a.stock_status === 'INSUFFICIENT');
  const partial = availability.filter(a => a.stock_status === 'PARTIAL');

  if (insufficient.length > 0) {
    const alert = document.createElement('div');
    alert.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-4';
    alert.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <p class="font-bold">Critical Blood Shortage</p>
          <p class="text-sm">Insufficient stock for blood groups: ${insufficient.map(a => a.blood_group.toUpperCase()).join(', ')}</p>
        </div>
      </div>
    `;
    container.appendChild(alert);
  }

  if (partial.length > 0) {
    const alert = document.createElement('div');
    alert.className = 'bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 rounded';
    alert.innerHTML = `
      <div class="flex items-center">
        <svg class="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
        </svg>
        <div>
          <p class="font-bold">Partial Blood Availability</p>
          <p class="text-sm">Limited stock for blood groups: ${partial.map(a => a.blood_group.toUpperCase()).join(', ')}</p>
        </div>
      </div>
    `;
    container.appendChild(alert);
  }
}

// Create availability chart
function createAvailabilityChart(availability) {
  const ctx = document.getElementById('availabilityChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: availability.map(a => a.blood_group.toUpperCase()),
      datasets: [
        {
          label: 'Units Needed',
          data: availability.map(a => a.total_units_needed),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
        {
          label: 'Available Units',
          data: availability.map(a => a.available_units),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

// Create status chart
async function createStatusChart() {
  try {
    const stats = await fetchAuthenticated('http://localhost:3000/api/hospital/statistics');
    
    const ctx = document.getElementById('statusChart').getContext('2d');
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Approved', 'Fulfilled', 'Rejected'],
        datasets: [{
          data: [
            stats.pending_requests || 0,
            stats.approved_requests || 0,
            stats.fulfilled_requests || 0,
            stats.rejected_requests || 0
          ],
          backgroundColor: [
            'rgba(251, 146, 60, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true
      }
    });
  } catch (error) {
    console.error('Error creating status chart:', error);
  }
}

// Load history
async function loadHistory() {
  try {
    const bloodGroup = document.getElementById('history-blood-group').value;
    const status = document.getElementById('history-status').value;
    
    let url = `http://localhost:3000/api/hospital/history?`;
    if (bloodGroup) url += `blood_group=${bloodGroup}&`;
    if (status) url += `status=${status}`;
    
    const history = await fetchAuthenticated(url);
    displayHistory(history);
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

// Display history
function displayHistory(history) {
  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = '';

  if (history.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No history found</td></tr>';
    return;
  }

  history.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    const statusColors = {
      fulfilled: 'bg-green-100 text-green-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      pending: 'bg-orange-100 text-orange-800'
    };

    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.request_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.patient_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${item.requested_blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.units_needed}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(item.request_date)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusColors[item.status]}">
          ${item.status.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.donor_name || 'N/A'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Switch tabs
function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('[id^="tab-"]').forEach(btn => {
    btn.classList.remove('text-red-600', 'border-b-2', 'border-red-600');
    btn.classList.add('text-gray-600');
  });
  document.getElementById(`tab-${tab}`).classList.add('text-red-600', 'border-b-2', 'border-red-600');
  document.getElementById(`tab-${tab}`).classList.remove('text-gray-600');

  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.add('hidden');
  });
  document.getElementById(`content-${tab}`).classList.remove('hidden');

  // Load data if needed
  if (tab === 'history') {
    loadHistory();
  }
}

// Close warnings dropdown when clicking outside
document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('warnings-dropdown');
  const button = event.target.closest('button[onclick="toggleWarnings()"]');
  
  if (!dropdown.contains(event.target) && !button) {
    dropdown.classList.add('hidden');
  }
});

// Initialize on page load
initDashboard();
createStatusChart();