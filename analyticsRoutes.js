const express = require('express');
const router = express.Router();
const db = require('./db');

// =====================================================
// Get inventory summary (using view)
// =====================================================
router.get('/inventory-summary', async (req, res) => {
  try {
    const [summary] = await db.query('SELECT * FROM inventory_summary_view ORDER BY blood_group');
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get blood compatibility matrix (using view)
// =====================================================
router.get('/compatibility-matrix', async (req, res) => {
  try {
    const [matrix] = await db.query(`
      SELECT * FROM blood_compatibility_view 
      WHERE compatibility_status = 'COMPATIBLE'
      ORDER BY recipient_blood_group, donor_blood_group
    `);
    res.json(matrix);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get donor eligibility report (using view)
// =====================================================
router.get('/donor-eligibility', async (req, res) => {
  try {
    const { eligible_only } = req.query;
    
    let query = 'SELECT * FROM donor_eligibility_view';
    
    if (eligible_only === 'true') {
      query += ' WHERE age_eligibility = "ELIGIBLE" AND donation_gap_eligibility = "ELIGIBLE"';
    }
    
    query += ' ORDER BY total_donations DESC, last_donation_date DESC';

    const [donors] = await db.query(query);
    res.json(donors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get blood waste analysis
// Complex query with subqueries and aggregations
// =====================================================
router.get('/waste-analysis', async (req, res) => {
  try {
    const [analysis] = await db.query(`
      SELECT 
        blood_group,
        COUNT(*) as total_expired,
        SUM(volume) as total_volume_wasted,
        AVG(DATEDIFF(expiry_date, collection_date)) as avg_storage_days,
        MIN(expiry_date) as earliest_expiry,
        MAX(expiry_date) as latest_expiry,
        (SELECT COUNT(*) 
         FROM blood_specimen bs2 
         WHERE bs2.blood_group = bs.blood_group 
         AND bs2.expiry_date > CURDATE()) as current_stock,
        ROUND(COUNT(*) * 100.0 / 
          (SELECT COUNT(*) FROM blood_specimen bs3 WHERE bs3.blood_group = bs.blood_group), 2
        ) as waste_percentage
      FROM blood_specimen bs
      WHERE expiry_date < CURDATE()
      GROUP BY blood_group
      ORDER BY total_volume_wasted DESC
    `);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get donation trends
// Time-series analysis with aggregations
// =====================================================
router.get('/donation-trends', async (req, res) => {
  try {
    const { period = 'month', months = 12 } = req.query;
    
    let dateFormat, dateGroup;
    if (period === 'week') {
      dateFormat = '%Y-%u';
      dateGroup = 'YEARWEEK(collection_date)';
    } else if (period === 'day') {
      dateFormat = '%Y-%m-%d';
      dateGroup = 'DATE(collection_date)';
    } else {
      dateFormat = '%Y-%m';
      dateGroup = 'DATE_FORMAT(collection_date, "%Y-%m")';
    }

    const [trends] = await db.query(`
      SELECT 
        ${dateGroup} as period,
        DATE_FORMAT(collection_date, ?) as period_label,
        blood_group,
        COUNT(*) as donation_count,
        SUM(volume) as total_volume,
        AVG(volume) as avg_volume,
        COUNT(DISTINCT donor_id) as unique_donors
      FROM blood_specimen
      WHERE collection_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY ${dateGroup}, DATE_FORMAT(collection_date, ?), blood_group
      ORDER BY period DESC, blood_group
    `, [dateFormat, parseInt(months), dateFormat]);

    res.json(trends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get critical shortages
// Uses multiple subqueries and EXISTS
// =====================================================
router.get('/critical-shortages', async (req, res) => {
  try {
    const [shortages] = await db.query(`
      SELECT 
        br.blood_group,
        COUNT(*) as pending_requests,
        SUM(br.units_needed) as units_needed,
        (SELECT COUNT(*) 
         FROM blood_specimen bs 
         WHERE bs.blood_group = br.blood_group 
         AND bs.expiry_date > CURDATE()
         AND NOT EXISTS (
           SELECT 1 FROM request_fulfillment rf WHERE rf.specimen_id = bs.specimen_id
         )
        ) as available_units,
        (SELECT SUM(volume) 
         FROM blood_specimen bs 
         WHERE bs.blood_group = br.blood_group 
         AND bs.expiry_date > CURDATE()
         AND NOT EXISTS (
           SELECT 1 FROM request_fulfillment rf WHERE rf.specimen_id = bs.specimen_id
         )
        ) as available_volume,
        SUM(br.units_needed) - 
        COALESCE((SELECT COUNT(*) 
         FROM blood_specimen bs 
         WHERE bs.blood_group = br.blood_group 
         AND bs.expiry_date > CURDATE()
         AND NOT EXISTS (
           SELECT 1 FROM request_fulfillment rf WHERE rf.specimen_id = bs.specimen_id
         )
        ), 0) as shortage_units,
        CASE 
          WHEN (SELECT COUNT(*) 
                FROM blood_specimen bs 
                WHERE bs.blood_group = br.blood_group 
                AND bs.expiry_date > CURDATE()
                AND NOT EXISTS (
                  SELECT 1 FROM request_fulfillment rf WHERE rf.specimen_id = bs.specimen_id
                )
               ) = 0 THEN 'CRITICAL'
          WHEN (SELECT COUNT(*) 
                FROM blood_specimen bs 
                WHERE bs.blood_group = br.blood_group 
                AND bs.expiry_date > CURDATE()
                AND NOT EXISTS (
                  SELECT 1 FROM request_fulfillment rf WHERE rf.specimen_id = bs.specimen_id
                )
               ) < SUM(br.units_needed) THEN 'SEVERE'
          ELSE 'MODERATE'
        END as severity
      FROM blood_request br
      WHERE br.status IN ('pending', 'approved')
      GROUP BY br.blood_group
      HAVING shortage_units > 0
      ORDER BY severity DESC, shortage_units DESC
    `);

    res.json(shortages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get fulfillment performance
// Complex JOIN with aggregations
// =====================================================
router.get('/fulfillment-performance', async (req, res) => {
  try {
    const [performance] = await db.query(`
      SELECT 
        h.hospital_id,
        h.name as hospital_name,
        COUNT(br.request_id) as total_requests,
        COUNT(rf.fulfillment_id) as fulfilled_requests,
        ROUND(COUNT(rf.fulfillment_id) * 100.0 / COUNT(br.request_id), 2) as fulfillment_rate,
        AVG(DATEDIFF(rf.fulfillment_date, br.request_date)) as avg_days_to_fulfill,
        MIN(DATEDIFF(rf.fulfillment_date, br.request_date)) as min_days_to_fulfill,
        MAX(DATEDIFF(rf.fulfillment_date, br.request_date)) as max_days_to_fulfill,
        SUM(br.units_needed) as total_units_requested,
        COUNT(CASE WHEN br.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN br.status = 'rejected' THEN 1 END) as rejected_count
      FROM hospital h
      LEFT JOIN blood_request br ON h.hospital_id = br.hospital_id
      LEFT JOIN request_fulfillment rf ON br.request_id = rf.request_id
      WHERE br.request_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY h.hospital_id, h.name
      HAVING total_requests > 0
      ORDER BY fulfillment_rate DESC, avg_days_to_fulfill ASC
    `);

    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Get top donors
// Uses ranking and window functions concept
// =====================================================
router.get('/top-donors', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const [donors] = await db.query(`
      SELECT 
        d.donor_id,
        CONCAT(d.first_name, ' ', d.last_name) as donor_name,
        d.sex,
        d.phone_number,
        d.email_id,
        COUNT(bs.specimen_id) as total_donations,
        SUM(bs.volume) as total_volume_donated,
        MAX(bs.collection_date) as last_donation,
        MIN(bs.collection_date) as first_donation,
        DATEDIFF(MAX(bs.collection_date), MIN(bs.collection_date)) as donor_span_days,
        (SELECT blood_group FROM blood_specimen 
         WHERE donor_id = d.donor_id 
         ORDER BY collection_date DESC LIMIT 1) as blood_group,
        ROUND(SUM(bs.volume) / 
          NULLIF(DATEDIFF(MAX(bs.collection_date), MIN(bs.collection_date)) / 365, 0), 2
        ) as avg_annual_volume
      FROM donor d
      JOIN blood_specimen bs ON d.donor_id = bs.donor_id
      GROUP BY d.donor_id, d.first_name, d.last_name, d.sex, d.phone_number, d.email_id
      ORDER BY total_donations DESC, total_volume_donated DESC
      LIMIT ?
    `, [parseInt(limit)]);

    res.json(donors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;