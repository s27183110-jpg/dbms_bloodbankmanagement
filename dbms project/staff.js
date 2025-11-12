let allStaff = [];
let editingStaffId = null;

// Load all staff
async function loadStaff() {
  try {
    const response = await fetch('http://localhost:3000/api/staff');
    allStaff = await response.json();
    displayStaff(allStaff);
  } catch (error) {
    console.error('Error loading staff:', error);
    showNotification('Error loading staff', 'error');
  }
}

// Display staff in table
function displayStaff(staff) {
  const tbody = document.getElementById('staff-tbody');
  tbody.innerHTML = '';

  if (staff.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">No staff found</td></tr>';
    return;
  }

  staff.forEach(member => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50';
    
    const roleColor = {
      'Doctor': 'bg-blue-100 text-blue-800',
      'Nurse': 'bg-green-100 text-green-800',
      'Lab Technician': 'bg-purple-100 text-purple-800',
      'General Staff': 'bg-gray-100 text-gray-800'
    };

    const details = member.Specialization || member.Patient_Type || member.Tests_performed || 'N/A';

    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member.Staff_ID}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${member.First_Name} ${member.Middle_Name || ''} ${member.Last_Name}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <span class="px-2 py-1 rounded-full text-xs font-semibold ${roleColor[member.role]}">
          ${member.role}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member.qualification}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member.phone_number || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${details}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button onclick="editStaff(${member.Staff_ID})" class="text-blue-600 hover:text-blue-900">Edit</button>
        <button onclick="deleteStaff(${member.Staff_ID})" class="text-red-600 hover:text-red-900">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search staff
function searchStaff() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filtered = allStaff.filter(member => 
    member.Staff_ID.toString().includes(searchTerm) ||
    member.First_Name.toLowerCase().includes(searchTerm) ||
    member.Last_Name.toLowerCase().includes(searchTerm)
  );
  displayStaff(filtered);
}

// Open modal for adding staff
function openAddStaffModal() {
  editingStaffId = null;
  document.getElementById('modal-title').textContent = 'Add Staff';
  document.getElementById('staff-form').reset();
  document.getElementById('Staff_ID').disabled = false;
  document.getElementById('staff-modal').classList.remove('hidden');
}

// Open modal for editing staff
async function editStaff(staffId) {
  try {
    const response = await fetch(`http://localhost:3000/api/staff/${staffId}`);
    const staff = await response.json();
    
    editingStaffId = staffId;
    document.getElementById('modal-title').textContent = 'Edit Staff';
    document.getElementById('Staff_ID').value = staff.Staff_ID;
    document.getElementById('Staff_ID').disabled = true;
    document.getElementById('First_Name').value = staff.First_Name;
    document.getElementById('Middle_Name').value = staff.Middle_Name || '';
    document.getElementById('Last_Name').value = staff.Last_Name;
    document.getElementById('phone_number').value = staff.phone_number || '';
    document.getElementById('qualification').value = staff.qualification;
    
    document.getElementById('staff-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading staff:', error);
    showNotification('Error loading staff details', 'error');
  }
}

// Save staff (create or update)
async function saveStaff(event) {
  event.preventDefault();
  
  const staffData = {
    Staff_ID: parseInt(document.getElementById('Staff_ID').value),
    First_Name: document.getElementById('First_Name').value,
    Middle_Name: document.getElementById('Middle_Name').value,
    Last_Name: document.getElementById('Last_Name').value,
    phone_number: document.getElementById('phone_number').value,
    qualification: document.getElementById('qualification').value
  };

  try {
    const url = editingStaffId 
      ? `http://localhost:3000/api/staff/${editingStaffId}`
      : 'http://localhost:3000/api/staff';
    
    const method = editingStaffId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(staffData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      closeModal();
      loadStaff();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error saving staff:', error);
    showNotification('Error saving staff', 'error');
  }
}

// Delete staff
async function deleteStaff(staffId) {
  if (!confirm('Are you sure you want to delete this staff member?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/staff/${staffId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadStaff();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting staff:', error);
    showNotification('Error deleting staff', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('staff-modal').classList.add('hidden');
}

// Initialize page
loadStaff();