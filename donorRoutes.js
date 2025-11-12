const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all donors
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donor ORDER BY donor_id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get donor by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM donor WHERE donor_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new donor
router.post('/', async (req, res) => {
  const { donor_id, first_name, middle_name, last_name, address, email_id, phone_number, sex, date_of_birth } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO donor (donor_id, first_name, middle_name, last_name, address, email_id, phone_number, sex, date_of_birth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [donor_id, first_name, middle_name, last_name, address, email_id, phone_number, sex, date_of_birth]
    );
    res.status(201).json({ message: 'Donor created successfully', donor_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update donor
router.put('/:id', async (req, res) => {
  const { first_name, middle_name, last_name, address, email_id, phone_number, sex, date_of_birth } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE donor SET first_name = ?, middle_name = ?, last_name = ?, address = ?, email_id = ?, phone_number = ?, sex = ?, date_of_birth = ? WHERE donor_id = ?',
      [first_name, middle_name, last_name, address, email_id, phone_number, sex, date_of_birth, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    res.json({ message: 'Donor updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete donor
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM donor WHERE donor_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Donor not found' });
    }
    res.json({ message: 'Donor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get donor donation history
router.get('/:id/donations', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM blood_specimen WHERE donor_id = ? ORDER BY collection_date DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;