const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all patients
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patient ORDER BY patient_id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM patient WHERE patient_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new patient
router.post('/', async (req, res) => {
  const { patient_id, first_name, middle_name, last_name, blood_group, medical_condition, phone_number, address, email_id, sex, date_of_birth } = req.body;
  try {
    await db.query(
      'INSERT INTO patient (patient_id, first_name, middle_name, last_name, blood_group, medical_condition, phone_number, address, email_id, sex, date_of_birth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [patient_id, first_name, middle_name, last_name, blood_group, medical_condition, phone_number, address, email_id, sex, date_of_birth]
    );
    res.status(201).json({ message: 'Patient created successfully', patient_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update patient
router.put('/:id', async (req, res) => {
  const { first_name, middle_name, last_name, blood_group, medical_condition, phone_number, address, email_id, sex, date_of_birth } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE patient SET first_name = ?, middle_name = ?, last_name = ?, blood_group = ?, medical_condition = ?, phone_number = ?, address = ?, email_id = ?, sex = ?, date_of_birth = ? WHERE patient_id = ?',
      [first_name, middle_name, last_name, blood_group, medical_condition, phone_number, address, email_id, sex, date_of_birth, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete patient
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM patient WHERE patient_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient blood requests
router.get('/:id/requests', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT br.*, h.name as hospital_name FROM blood_request br JOIN hospital h ON br.hospital_id = h.hospital_id WHERE br.patient_id = ? ORDER BY br.request_date DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;