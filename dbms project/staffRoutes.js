const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all staff with their roles
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.*, 
        CASE 
          WHEN d.Staff_ID IS NOT NULL THEN 'Doctor'
          WHEN n.Staff_ID IS NOT NULL THEN 'Nurse'
          WHEN l.Staff_ID IS NOT NULL THEN 'Lab Technician'
          ELSE 'General Staff'
        END as role,
        d.Specialization,
        n.Patient_Type,
        l.Tests_performed
      FROM Staff s
      LEFT JOIN Doctor d ON s.Staff_ID = d.Staff_ID
      LEFT JOIN Nurse n ON s.Staff_ID = n.Staff_ID
      LEFT JOIN Lab_Technician l ON s.Staff_ID = l.Staff_ID
      ORDER BY s.Staff_ID
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Staff WHERE Staff_ID = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new staff
router.post('/', async (req, res) => {
  const { Staff_ID, First_Name, Middle_Name, Last_Name, phone_number, qualification } = req.body;
  try {
    await db.query(
      'INSERT INTO Staff (Staff_ID, First_Name, Middle_Name, Last_Name, phone_number, qualification) VALUES (?, ?, ?, ?, ?, ?)',
      [Staff_ID, First_Name, Middle_Name, Last_Name, phone_number, qualification]
    );
    res.status(201).json({ message: 'Staff created successfully', Staff_ID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update staff
router.put('/:id', async (req, res) => {
  const { First_Name, Middle_Name, Last_Name, phone_number, qualification } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE Staff SET First_Name = ?, Middle_Name = ?, Last_Name = ?, phone_number = ?, qualification = ? WHERE Staff_ID = ?',
      [First_Name, Middle_Name, Last_Name, phone_number, qualification, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ message: 'Staff updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete staff
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM Staff WHERE Staff_ID = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Staff not found' });
    }
    res.json({ message: 'Staff deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add doctor specialization
router.post('/:id/doctor', async (req, res) => {
  const { Specialization } = req.body;
  try {
    await db.query(
      'INSERT INTO Doctor (Staff_ID, Specialization) VALUES (?, ?)',
      [req.params.id, Specialization]
    );
    res.status(201).json({ message: 'Doctor specialization added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add nurse patient type
router.post('/:id/nurse', async (req, res) => {
  const { Patient_Type } = req.body;
  try {
    await db.query(
      'INSERT INTO Nurse (Staff_ID, Patient_Type) VALUES (?, ?)',
      [req.params.id, Patient_Type]
    );
    res.status(201).json({ message: 'Nurse information added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add lab technician tests
router.post('/:id/lab-tech', async (req, res) => {
  const { Tests_performed } = req.body;
  try {
    await db.query(
      'INSERT INTO Lab_Technician (Staff_ID, Tests_performed) VALUES (?, ?)',
      [req.params.id, Tests_performed]
    );
    res.status(201).json({ message: 'Lab technician information added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;