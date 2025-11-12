let allSpecimens = [];
let editingSpecimenId = null;

// Load all blood specimens
async function loadSpecimens() {
  try {
    const response = await fetch('http://localhost:3000/api/blood-stock');
    allSpecimens = await response.json();
    displaySpecimens(allSpecimens);
    loadBloodSummary();
    checkExpiringSpecimens();
  } catch (error) {
    console.error('Error loading specimens:', error);
    showNotification('Error loading blood stock', 'error');
  }
}

// Load blood group summary
async function loadBloodSummary() {
  try {
    const response = await fetch('http://localhost:3000/api/blood-stock/summary');
    const summary = await response.json();
    displayBloodSummary(summary);
  } catch (error) {
    console.error('Error loading summary:', error);
  }
}

// Display blood group summary cards
function displayBloodSummary(summary) {
  const container = document.getElementById('blood-summary');
  container.innerHTML = '';

  const bloodGroups = ['a+', 'a-', 'b+', 'b-', 'o+', 'o-', 'ab+', 'ab-'];
  
  bloodGroups.forEach(group => {
    const data = summary.find(s => s.blood_group === group) || { 
      blood_group: group, 
      available_units: 0 
    };

    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow p-4 text-center hover:shadow-lg transition';
    card.innerHTML = `
      <div class="text-2xl font-bold text-red-600">${group.toUpperCase()}</div>
      <div class="text-3xl font-bold text-gray-800 my-2">${data.available_units || 0}</div>
      <div class="text-xs text-gray-600">Units Available</div>
    `;
    container.appendChild(card);
  });
}

// Check for expiring specimens
async function checkExpiringSpecimens() {
  try {
    const response = await fetch('http://localhost:3000/api/blood-stock/alerts/expiring');
    const expiring = await response.json();
    
    if (expiring.length > 0) {
      document.getElementById('expiring-alert').classList.remove('hidden');
      document.getElementById('expiring-count').textContent = expiring.length;
    } else {
      document.getElementById('expiring-alert').classList.add('hidden');
    }
  } catch (error) {
    console.error('Error checking expiring specimens:', error);
  }
}

// Display specimens in table
function displaySpecimens(specimens) {
  const tbody = document.getElementById('specimens-tbody');
  tbody.innerHTML = '';

  if (specimens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-500">No blood specimens found</td></tr>';
    return;
  }

  specimens.forEach(specimen => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    const daysLeft = specimen.days_until_expiry;
    let statusBadge = '';
    let statusClass = '';
    
    if (daysLeft < 0) {
      statusBadge = 'EXPIRED';
      statusClass = 'bg-red-100 text-red-800';
    } else if (daysLeft <= 7) {
      statusBadge = `${daysLeft} days`;
      statusClass = 'bg-orange-100 text-orange-800';
    } else {
      statusBadge = `${daysLeft} days`;
      statusClass = 'bg-green-100 text-green-800';
    }

    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${specimen.specimen_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${specimen.donor_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${specimen.blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${specimen.volume}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(specimen.collection_date)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(specimen.expiry_date)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${statusClass}">
          ${statusBadge}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${specimen.blood_bank_name}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button onclick="editSpecimen('${specimen.specimen_id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
        <button onclick="deleteSpecimen('${specimen.specimen_id}')" class="text-red-600 hover:text-red-900">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search and filter specimens
function searchSpecimens() {
  filterSpecimens();
}

function filterSpecimens() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const bloodGroupFilter = document.getElementById('blood-group-filter').value.toLowerCase();
  const statusFilter = document.getElementById('status-filter').value;

  const filtered = allSpecimens.filter(specimen => {
    const matchesSearch = specimen.specimen_id.toLowerCase().includes(searchTerm) ||
                         specimen.donor_name.toLowerCase().includes(searchTerm);
    
    const matchesBloodGroup = !bloodGroupFilter || specimen.blood_group === bloodGroupFilter;
    
    let matchesStatus = true;
    if (statusFilter === 'available') {
      matchesStatus = specimen.days_until_expiry > 7;
    } else if (statusFilter === 'expiring') {
      matchesStatus = specimen.days_until_expiry <= 7 && specimen.days_until_expiry >= 0;
    } else if (statusFilter === 'expired') {
      matchesStatus = specimen.days_until_expiry < 0;
    }

    return matchesSearch && matchesBloodGroup && matchesStatus;
  });

  displaySpecimens(filtered);
}

// Open modal for adding specimen
function openAddSpecimenModal() {
  editingSpecimenId = null;
  document.getElementById('modal-title').textContent = 'Add Blood Specimen';
  document.getElementById('specimen-form').reset();
  document.getElementById('specimen_id').disabled = false;
  
  // Set default collection date to today
  document.getElementById('collection_date').value = new Date().toISOString().split('T')[0];
  
  // Set default expiry date to 3 months from today
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + 3);
  document.getElementById('expiry_date').value = expiryDate.toISOString().split('T')[0];
  
  document.getElementById('specimen-modal').classList.remove('hidden');
}

// Open modal for editing specimen
async function editSpecimen(specimenId) {
  try {
    const response = await fetch(`http://localhost:3000/api/blood-stock/${specimenId}`);
    const specimen = await response.json();
    
    editingSpecimenId = specimenId;
    document.getElementById('modal-title').textContent = 'Edit Blood Specimen';
    document.getElementById('specimen_id').value = specimen.specimen_id;
    document.getElementById('specimen_id').disabled = true;
    document.getElementById('donor_id').value = specimen.donor_id;
    document.getElementById('blood_group').value = specimen.blood_group;
    document.getElementById('volume').value = specimen.volume;
    document.getElementById('collection_date').value = formatDateForInput(specimen.collection_date);
    document.getElementById('expiry_date').value = formatDateForInput(specimen.expiry_date);
    document.getElementById('blood_bank_id').value = specimen.blood_bank_id;
    
    document.getElementById('specimen-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading specimen:', error);
    showNotification('Error loading specimen details', 'error');
  }
}

// Save specimen (create or update)
async function saveSpecimen(event) {
  event.preventDefault();
  
  const specimenData = {
    specimen_id: document.getElementById('specimen_id').value,
    donor_id: document.getElementById('donor_id').value,
    blood_group: document.getElementById('blood_group').value,
    volume: parseFloat(document.getElementById('volume').value),
    collection_date: document.getElementById('collection_date').value,
    expiry_date: document.getElementById('expiry_date').value,
    blood_bank_id: document.getElementById('blood_bank_id').value
  };

  try {
    const url = editingSpecimenId 
      ? `http://localhost:3000/api/blood-stock/${editingSpecimenId}`
      : 'http://localhost:3000/api/blood-stock';
    
    const method = editingSpecimenId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(specimenData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      closeModal();
      loadSpecimens();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error saving specimen:', error);
    showNotification('Error saving specimen', 'error');
  }
}

// Delete specimen
async function deleteSpecimen(specimenId) {
  if (!confirm('Are you sure you want to delete this blood specimen?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/blood-stock/${specimenId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadSpecimens();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting specimen:', error);
    showNotification('Error deleting specimen', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('specimen-modal').classList.add('hidden');
}

// Initialize page
loadSpecimens();