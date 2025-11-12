let allDonors = [];
let editingDonorId = null;

// Load all donors
async function loadDonors() {
  try {
    const response = await fetch('http://localhost:3000/api/donors');
    allDonors = await response.json();
    displayDonors(allDonors);
  } catch (error) {
    console.error('Error loading donors:', error);
    showNotification('Error loading donors', 'error');
  }
}

// Display donors in table
function displayDonors(donors) {
  const tbody = document.getElementById('donors-tbody');
  tbody.innerHTML = '';

  if (donors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No donors found</td></tr>';
    return;
  }

  donors.forEach(donor => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${donor.donor_id}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${donor.first_name} ${donor.middle_name || ''} ${donor.last_name}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${donor.sex}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatDate(donor.date_of_birth)}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${donor.phone_number || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${donor.email_id || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button onclick="editDonor('${donor.donor_id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
        <button onclick="deleteDonor('${donor.donor_id}')" class="text-red-600 hover:text-red-900">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search donors
function searchDonors() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filtered = allDonors.filter(donor => 
    donor.donor_id.toLowerCase().includes(searchTerm) ||
    donor.first_name.toLowerCase().includes(searchTerm) ||
    donor.last_name.toLowerCase().includes(searchTerm) ||
    (donor.phone_number && donor.phone_number.includes(searchTerm))
  );
  displayDonors(filtered);
}

// Open modal for adding donor
function openAddDonorModal() {
  editingDonorId = null;
  document.getElementById('modal-title').textContent = 'Add Donor';
  document.getElementById('donor-form').reset();
  document.getElementById('donor_id').disabled = false;
  document.getElementById('donor-modal').classList.remove('hidden');
}

// Open modal for editing donor
async function editDonor(donorId) {
  try {
    const response = await fetch(`http://localhost:3000/api/donors/${donorId}`);
    const donor = await response.json();
    
    editingDonorId = donorId;
    document.getElementById('modal-title').textContent = 'Edit Donor';
    document.getElementById('donor_id').value = donor.donor_id;
    document.getElementById('donor_id').disabled = true;
    document.getElementById('first_name').value = donor.first_name;
    document.getElementById('middle_name').value = donor.middle_name || '';
    document.getElementById('last_name').value = donor.last_name;
    document.getElementById('sex').value = donor.sex;
    document.getElementById('date_of_birth').value = formatDateForInput(donor.date_of_birth);
    document.getElementById('phone_number').value = donor.phone_number || '';
    document.getElementById('email_id').value = donor.email_id || '';
    document.getElementById('address').value = donor.address || '';
    
    document.getElementById('donor-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading donor:', error);
    showNotification('Error loading donor details', 'error');
  }
}

// Save donor (create or update)
async function saveDonor(event) {
  event.preventDefault();
  
  const donorData = {
    donor_id: document.getElementById('donor_id').value,
    first_name: document.getElementById('first_name').value,
    middle_name: document.getElementById('middle_name').value,
    last_name: document.getElementById('last_name').value,
    sex: document.getElementById('sex').value,
    date_of_birth: document.getElementById('date_of_birth').value,
    phone_number: document.getElementById('phone_number').value,
    email_id: document.getElementById('email_id').value,
    address: document.getElementById('address').value
  };

  try {
    const url = editingDonorId 
      ? `http://localhost:3000/api/donors/${editingDonorId}`
      : 'http://localhost:3000/api/donors';
    
    const method = editingDonorId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(donorData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      closeModal();
      loadDonors();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error saving donor:', error);
    showNotification('Error saving donor', 'error');
  }
}

// Delete donor
async function deleteDonor(donorId) {
  if (!confirmDelete('Are you sure you want to delete this donor?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/donors/${donorId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadDonors();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting donor:', error);
    showNotification('Error deleting donor', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('donor-modal').classList.add('hidden');
}

// Initialize page
loadDonors();