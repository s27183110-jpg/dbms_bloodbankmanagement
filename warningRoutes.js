const express = require('express');
const router = express.Router();
const db = require('./db');

// Get all warnings (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { severity, entity_type, is_read, hospital_id, limit = 50 } = req.query;
    
    let query = 'SELECT * FROM system_warnings WHERE 1=1';
    const params = [];

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }

    if (is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(is_read === 'true' ? 1 : 0);
    }

    if (hospital_id) {
      query += ' AND (hospital_id = ? OR hospital_id IS NULL)';
      params.push(hospital_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [warnings] = await db.query(query, params);
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread warning count
router.get('/count/unread', async (req, res) => {
  try {
    const { hospital_id } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM system_warnings WHERE is_read = FALSE';
    const params = [];

    if (hospital_id) {
      query += ' AND (hospital_id = ? OR hospital_id IS NULL)';
      params.push(hospital_id);
    }

    const [result] = await db.query(query, params);
    res.json({ unread_count: result[0].count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get warnings by severity
router.get('/by-severity', async (req, res) => {
  try {
    const { hospital_id } = req.query;
    
    let query = `
      SELECT 
        severity,
        COUNT(*) as count,
        COUNT(CASE WHEN is_read = FALSE THEN 1 END) as unread_count
      FROM system_warnings
      WHERE 1=1
    `;
    const params = [];

    if (hospital_id) {
      query += ' AND (hospital_id = ? OR hospital_id IS NULL)';
      params.push(hospital_id);
    }

    query += ' GROUP BY severity';

    const [warnings] = await db.query(query, params);
    res.json(warnings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark warning as read
router.put('/:id/read', async (req, res) => {
  try {
    const [result] = await db.query(
      'UPDATE system_warnings SET is_read = TRUE WHERE warning_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    res.json({ message: 'Warning marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all warnings as read
router.put('/read-all', async (req, res) => {
  try {
    const { hospital_id } = req.body;
    
    let query = 'UPDATE system_warnings SET is_read = TRUE WHERE is_read = FALSE';
    const params = [];

    if (hospital_id) {
      query += ' AND (hospital_id = ? OR hospital_id IS NULL)';
      params.push(hospital_id);
    }

    const [result] = await db.query(query, params);
    res.json({ message: 'All warnings marked as read', count: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete old warnings (older than 30 days)
router.delete('/cleanup', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM system_warnings WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)'
    );
    res.json({ message: 'Old warnings cleaned up', count: result.affectedRows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;