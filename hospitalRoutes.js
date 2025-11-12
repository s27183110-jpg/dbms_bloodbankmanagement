const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all hospitals
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hospital ORDER BY hospital_id');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get hospital by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM hospital WHERE hospital_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new hospital
router.post('/', async (req, res) => {
  const { hospital_id, name, phone_number, address, email_id } = req.body;
  try {
    await db.query(
      'INSERT INTO hospital (hospital_id, name, phone_number, address, email_id) VALUES (?, ?, ?, ?, ?)',
      [hospital_id, name, phone_number, address, email_id]
    );
    res.status(201).json({ message: 'Hospital created successfully', hospital_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update hospital
router.put('/:id', async (req, res) => {
  const { name, phone_number, address, email_id } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE hospital SET name = ?, phone_number = ?, address = ?, email_id = ? WHERE hospital_id = ?',
      [name, phone_number, address, email_id, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ message: 'Hospital updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete hospital
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM hospital WHERE hospital_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;