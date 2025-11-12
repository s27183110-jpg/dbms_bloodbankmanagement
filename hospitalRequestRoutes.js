const express = require('express');
const router = express.Router();
const db = require('./db');
const authRoutes = require('./authRoutes');

// Apply authentication middleware to all routes
router.use(authRoutes.authenticateToken);

// =====================================================
// Get requests for logged-in hospital (using view)
// =====================================================
router.get('/', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [requests] = await db.query(
      'SELECT * FROM hospital_blood_requests_view WHERE hospital_id = ? ORDER BY request_date DESC',
      [hospital_id]
    );

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get pending requests for hospital
// =====================================================
router.get('/pending', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [requests] = await db.query(
      `SELECT * FROM hospital_blood_requests_view 
       WHERE hospital_id = ? AND status = 'pending' 
       ORDER BY priority_level DESC, request_date ASC`,
      [hospital_id]
    );

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get hospital patients (using view)
// =====================================================
router.get('/patients', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [patients] = await db.query(
      'SELECT * FROM hospital_patients_view WHERE hospital_id = ? ORDER BY last_request_date DESC',
      [hospital_id]
    );

    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get hospital statistics (using view)
// =====================================================
router.get('/statistics', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [stats] = await db.query(
      'SELECT * FROM hospital_statistics_view WHERE hospital_id = ?',
      [hospital_id]
    );

    if (stats.length === 0) {
      return res.json({
        hospital_id,
        total_requests: 0,
        pending_requests: 0,
        fulfilled_requests: 0
      });
    }

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get blood availability for hospital requests
// Uses aggregate functions and subqueries
// =====================================================
router.get('/blood-availability', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [availability] = await db.query(`
      SELECT 
        br.blood_group,
        COUNT(DISTINCT br.request_id) as total_requests,
        SUM(br.units_needed) as total_units_needed,
        (SELECT COUNT(*) 
         FROM blood_specimen bs 
         WHERE bs.blood_group = br.blood_group 
         AND bs.expiry_date > CURDATE()
         AND bs.specimen_id NOT IN (SELECT specimen_id FROM request_fulfillment)
        ) as available_units,
        (SELECT SUM(volume) 
         FROM blood_specimen bs 
         WHERE bs.blood_group = br.blood_group 
         AND bs.expiry_date > CURDATE()
         AND bs.specimen_id NOT IN (SELECT specimen_id FROM request_fulfillment)
        ) as available_volume_ml,
        CASE 
          WHEN (SELECT COUNT(*) 
                FROM blood_specimen bs 
                WHERE bs.blood_group = br.blood_group 
                AND bs.expiry_date > CURDATE()
                AND bs.specimen_id NOT IN (SELECT specimen_id FROM request_fulfillment)
               ) >= SUM(br.units_needed) 
          THEN 'SUFFICIENT'
          WHEN (SELECT COUNT(*) 
                FROM blood_specimen bs 
                WHERE bs.blood_group = br.blood_group 
                AND bs.expiry_date > CURDATE()
                AND bs.specimen_id NOT IN (SELECT specimen_id FROM request_fulfillment)
               ) > 0
          THEN 'PARTIAL'
          ELSE 'INSUFFICIENT'
        END as stock_status
      FROM blood_request br
      WHERE br.hospital_id = ? AND br.status IN ('pending', 'approved')
      GROUP BY br.blood_group
      ORDER BY stock_status DESC, br.blood_group
    `, [hospital_id]);

    res.json(availability);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get request history with fulfillment details
// Complex JOIN query
// =====================================================
router.get('/history', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    const { start_date, end_date, blood_group, status } = req.query;
    
    let query = `
      SELECT 
        br.request_id,
        br.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.blood_group as patient_blood_group,
        br.blood_group as requested_blood_group,
        br.units_needed,
        br.request_date,
        br.status,
        rf.fulfillment_id,
        rf.fulfillment_date,
        rf.specimen_id,
        bs.donor_id,
        CONCAT(d.first_name, ' ', d.last_name) as donor_name,
        bs.blood_bank_id,
        bb.name as blood_bank_name,
        DATEDIFF(rf.fulfillment_date, br.request_date) as days_to_fulfill
      FROM blood_request br
      JOIN patient p ON br.patient_id = p.patient_id
      LEFT JOIN request_fulfillment rf ON br.request_id = rf.request_id
      LEFT JOIN blood_specimen bs ON rf.specimen_id = bs.specimen_id
      LEFT JOIN donor d ON bs.donor_id = d.donor_id
      LEFT JOIN blood_bank bb ON bs.blood_bank_id = bb.blood_bank_id
      WHERE br.hospital_id = ?
    `;
    
    const params = [hospital_id];

    if (start_date) {
      query += ' AND br.request_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND br.request_date <= ?';
      params.push(end_date);
    }

    if (blood_group) {
      query += ' AND br.blood_group = ?';
      params.push(blood_group);
    }

    if (status) {
      query += ' AND br.status = ?';
      params.push(status);
    }

    query += ' ORDER BY br.request_date DESC';

    const [history] = await db.query(query, params);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get monthly statistics
// Uses aggregate functions with GROUP BY
// =====================================================
router.get('/monthly-stats', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [stats] = await db.query(`
      SELECT 
        YEAR(request_date) as year,
        MONTH(request_date) as month,
        DATE_FORMAT(request_date, '%Y-%m') as month_year,
        COUNT(*) as total_requests,
        SUM(units_needed) as total_units,
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled_count,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        AVG(units_needed) as avg_units_per_request,
        MAX(units_needed) as max_units_requested,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM blood_request
      WHERE hospital_id = ? 
      AND request_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY YEAR(request_date), MONTH(request_date), DATE_FORMAT(request_date, '%Y-%m')
      ORDER BY year DESC, month DESC
    `, [hospital_id]);

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get patient summary for hospital
// Complex aggregation with HAVING clause
// =====================================================
router.get('/patient-summary', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    const { min_requests = 0 } = req.query;
    
    const [summary] = await db.query(`
      SELECT 
        p.patient_id,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        p.blood_group,
        p.medical_condition,
        COUNT(br.request_id) as total_requests,
        SUM(br.units_needed) as total_units_requested,
        AVG(br.units_needed) as avg_units_per_request,
        MIN(br.request_date) as first_request,
        MAX(br.request_date) as last_request,
        DATEDIFF(MAX(br.request_date), MIN(br.request_date)) as days_span,
        COUNT(CASE WHEN br.status = 'fulfilled' THEN 1 END) as fulfilled_count,
        COUNT(CASE WHEN br.status = 'pending' THEN 1 END) as pending_count,
        ROUND(COUNT(CASE WHEN br.status = 'fulfilled' THEN 1 END) * 100.0 / COUNT(*), 2) as fulfillment_rate
      FROM patient p
      JOIN blood_request br ON p.patient_id = br.patient_id
      WHERE br.hospital_id = ?
      GROUP BY p.patient_id, p.first_name, p.last_name, p.blood_group, p.medical_condition
      HAVING COUNT(br.request_id) >= ?
      ORDER BY total_requests DESC, last_request DESC
    `, [hospital_id, parseInt(min_requests)]);

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Compare hospital performance with others (anonymized)
// Uses set operations and complex aggregations
// =====================================================
router.get('/performance-comparison', async (req, res) => {
  try {
    const hospital_id = req.user.hospital_id;
    
    const [comparison] = await db.query(`
      SELECT 
        'Your Hospital' as hospital_category,
        COUNT(*) as total_requests,
        AVG(units_needed) as avg_units,
        ROUND(COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) * 100.0 / COUNT(*), 2) as fulfillment_rate,
        AVG(DATEDIFF(CURDATE(), request_date)) as avg_age_days
      FROM blood_request
      WHERE hospital_id = ?
      
      UNION ALL
      
      SELECT 
        'System Average' as hospital_category,
        COUNT(*) as total_requests,
        AVG(units_needed) as avg_units,
        ROUND(COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) * 100.0 / COUNT(*), 2) as fulfillment_rate,
        AVG(DATEDIFF(CURDATE(), request_date)) as avg_age_days
      FROM blood_request
      WHERE hospital_id != ?
    `, [hospital_id, hospital_id]);

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;