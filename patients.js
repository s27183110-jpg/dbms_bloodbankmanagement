let allPatients = [];
let editingPatientId = null;

// Load all patients
async function loadPatients() {
  try {
    const response = await fetch('http://localhost:3000/api/patients');
    allPatients = await response.json();
    displayPatients(allPatients);
  } catch (error) {
    console.error('Error loading patients:', error);
    showNotification('Error loading patients', 'error');
  }
}

// Display patients in table
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
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span class="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
          ${patient.blood_group.toUpperCase()}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.sex}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.medical_condition || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${patient.phone_number || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
        <button onclick="editPatient('${patient.patient_id}')" class="text-blue-600 hover:text-blue-900">Edit</button>
        <button onclick="deletePatient('${patient.patient_id}')" class="text-red-600 hover:text-red-900">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Search patients
function searchPatients() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const filtered = allPatients.filter(patient => 
    patient.patient_id.toLowerCase().includes(searchTerm) ||
    patient.first_name.toLowerCase().includes(searchTerm) ||
    patient.last_name.toLowerCase().includes(searchTerm) ||
    patient.blood_group.toLowerCase().includes(searchTerm)
  );
  displayPatients(filtered);
}

// Open modal for adding patient
function openAddPatientModal() {
  editingPatientId = null;
  document.getElementById('modal-title').textContent = 'Add Patient';
  document.getElementById('patient-form').reset();
  document.getElementById('patient_id').disabled = false;
  document.getElementById('patient-modal').classList.remove('hidden');
}

// Open modal for editing patient
async function editPatient(patientId) {
  try {
    const response = await fetch(`http://localhost:3000/api/patients/${patientId}`);
    const patient = await response.json();
    
    editingPatientId = patientId;
    document.getElementById('modal-title').textContent = 'Edit Patient';
    document.getElementById('patient_id').value = patient.patient_id;
    document.getElementById('patient_id').disabled = true;
    document.getElementById('first_name').value = patient.first_name;
    document.getElementById('middle_name').value = patient.middle_name || '';
    document.getElementById('last_name').value = patient.last_name;
    document.getElementById('blood_group').value = patient.blood_group;
    document.getElementById('sex').value = patient.sex;
    document.getElementById('date_of_birth').value = formatDateForInput(patient.date_of_birth);
    document.getElementById('phone_number').value = patient.phone_number || '';
    document.getElementById('email_id').value = patient.email_id || '';
    document.getElementById('medical_condition').value = patient.medical_condition || '';
    document.getElementById('address').value = patient.address || '';
    
    document.getElementById('patient-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading patient:', error);
    showNotification('Error loading patient details', 'error');
  }
}

// Save patient (create or update)
async function savePatient(event) {
  event.preventDefault();
  
  const patientData = {
    patient_id: document.getElementById('patient_id').value,
    first_name: document.getElementById('first_name').value,
    middle_name: document.getElementById('middle_name').value,
    last_name: document.getElementById('last_name').value,
    blood_group: document.getElementById('blood_group').value,
    sex: document.getElementById('sex').value,
    date_of_birth: document.getElementById('date_of_birth').value,
    phone_number: document.getElementById('phone_number').value,
    email_id: document.getElementById('email_id').value,
    medical_condition: document.getElementById('medical_condition').value,
    address: document.getElementById('address').value
  };

  try {
    const url = editingPatientId 
      ? `http://localhost:3000/api/patients/${editingPatientId}`
      : 'http://localhost:3000/api/patients';
    
    const method = editingPatientId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patientData)
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      closeModal();
      loadPatients();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error saving patient:', error);
    showNotification('Error saving patient', 'error');
  }
}

// Delete patient
async function deletePatient(patientId) {
  if (!confirm('Are you sure you want to delete this patient?')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3000/api/patients/${patientId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (response.ok) {
      showNotification(result.message, 'success');
      loadPatients();
    } else {
      showNotification(result.error, 'error');
    }
  } catch (error) {
    console.error('Error deleting patient:', error);
    showNotification('Error deleting patient', 'error');
  }
}

// Close modal
function closeModal() {
  document.getElementById('patient-modal').classList.add('hidden');
}

// Initialize page
loadPatients();