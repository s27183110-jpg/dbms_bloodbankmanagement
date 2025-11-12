const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all blood requests
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        h.name as hospital_name,
        DATEDIFF(CURDATE(), br.request_date) as days_pending
      FROM blood_request br
      JOIN patient p ON br.patient_id = p.patient_id
      JOIN hospital h ON br.hospital_id = h.hospital_id
      ORDER BY br.request_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get request by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blood_request WHERE request_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Blood request not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new blood request
router.post('/', async (req, res) => {
  const { request_id, patient_id, hospital_id, blood_group, units_needed, request_date, status } = req.body;
  try {
    await db.query(
      'INSERT INTO blood_request (request_id, patient_id, hospital_id, blood_group, units_needed, request_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [request_id, patient_id, hospital_id, blood_group, units_needed, request_date, status || 'pending']
    );
    res.status(201).json({ message: 'Blood request created successfully', request_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update blood request status
router.put('/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE blood_request SET status = ? WHERE request_id = ?',
      [status, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blood request not found' });
    }
    res.json({ message: 'Blood request updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete blood request
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM blood_request WHERE request_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blood request not found' });
    }
    res.json({ message: 'Blood request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending requests
router.get('/status/pending', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT br.*, 
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        h.name as hospital_name
      FROM blood_request br
      JOIN patient p ON br.patient_id = p.patient_id
      JOIN hospital h ON br.hospital_id = h.hospital_id
      WHERE br.status = 'pending'
      ORDER BY br.request_date ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fulfill a blood request
router.post('/:id/fulfill', async (req, res) => {
  const { specimen_id, fulfillment_date } = req.body;
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Generate fulfillment ID
    const fulfillment_id = 'FUL' + Date.now().toString().slice(-5);
    
    // Create fulfillment record
    await connection.query(
      'INSERT INTO request_fulfillment (fulfillment_id, request_id, specimen_id, fulfillment_date) VALUES (?, ?, ?, ?)',
      [fulfillment_id, req.params.id, specimen_id, fulfillment_date]
    );
    
    // Update request status
    await connection.query(
      'UPDATE blood_request SET status = "fulfilled" WHERE request_id = ?',
      [req.params.id]
    );
    
    await connection.commit();
    res.json({ message: 'Blood request fulfilled successfully', fulfillment_id });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;