const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all blood specimens
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT bs.*, 
        CONCAT(d.first_name, ' ', d.last_name) as donor_name,
        bb.name as blood_bank_name,
        DATEDIFF(bs.expiry_date, CURDATE()) as days_until_expiry
      FROM blood_specimen bs
      JOIN donor d ON bs.donor_id = d.donor_id
      JOIN blood_bank bb ON bs.blood_bank_id = bb.blood_bank_id
      ORDER BY bs.collection_date DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get blood stock summary by blood group
router.get('/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        blood_group,
        COUNT(*) as total_units,
        SUM(volume) as total_volume,
        SUM(CASE WHEN expiry_date > CURDATE() THEN 1 ELSE 0 END) as available_units,
        SUM(CASE WHEN expiry_date <= CURDATE() THEN 1 ELSE 0 END) as expired_units
      FROM blood_specimen
      GROUP BY blood_group
      ORDER BY blood_group
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specimen by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM blood_specimen WHERE specimen_id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Blood specimen not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new blood specimen
router.post('/', async (req, res) => {
  const { specimen_id, donor_id, blood_group, volume, collection_date, expiry_date, blood_bank_id } = req.body;
  try {
    await db.query(
      'INSERT INTO blood_specimen (specimen_id, donor_id, blood_group, volume, collection_date, expiry_date, blood_bank_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [specimen_id, donor_id, blood_group, volume, collection_date, expiry_date, blood_bank_id]
    );
    res.status(201).json({ message: 'Blood specimen created successfully', specimen_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update blood specimen
router.put('/:id', async (req, res) => {
  const { donor_id, blood_group, volume, collection_date, expiry_date, blood_bank_id } = req.body;
  try {
    const [result] = await db.query(
      'UPDATE blood_specimen SET donor_id = ?, blood_group = ?, volume = ?, collection_date = ?, expiry_date = ?, blood_bank_id = ? WHERE specimen_id = ?',
      [donor_id, blood_group, volume, collection_date, expiry_date, blood_bank_id, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blood specimen not found' });
    }
    res.json({ message: 'Blood specimen updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete blood specimen
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM blood_specimen WHERE specimen_id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blood specimen not found' });
    }
    res.json({ message: 'Blood specimen deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get expiring specimens (within 7 days)
router.get('/alerts/expiring', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT bs.*, 
        CONCAT(d.first_name, ' ', d.last_name) as donor_name,
        bb.name as blood_bank_name,
        DATEDIFF(bs.expiry_date, CURDATE()) as days_until_expiry
      FROM blood_specimen bs
      JOIN donor d ON bs.donor_id = d.donor_id
      JOIN blood_bank bb ON bs.blood_bank_id = bb.blood_bank_id
      WHERE bs.expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY bs.expiry_date ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;