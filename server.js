const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

// Import route files
const donorRoutes = require('./donorRoutes');
const patientRoutes = require('./patientRoutes');
const staffRoutes = require('./staffRoutes');
const bloodStockRoutes = require('./bloodStockRoutes');
const requestRoutes = require('./requestRoutes');
const hospitalRoutes = require('./hospitalRoutes');

// NEW: Import authentication and hospital-specific routes
const authRoutes = require('./authRoutes');
const warningRoutes = require('./warningRoutes');
const hospitalRequestRoutes = require('./hospitalRequestRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// API Routes - Public
app.use('/api/donors', donorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/blood-stock', bloodStockRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/hospitals', hospitalRoutes);

// NEW: Authentication routes
app.use('/api/auth', authRoutes);

// NEW: Warning system routes
app.use('/api/warnings', warningRoutes);

// NEW: Hospital-specific routes (requires authentication)
app.use('/api/hospital', hospitalRequestRoutes);

// NEW: Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  const db = require('./db');
  try {
    const [donors] = await db.query('SELECT COUNT(*) as count FROM donor');
    const [patients] = await db.query('SELECT COUNT(*) as count FROM patient');
    const [specimens] = await db.query('SELECT COUNT(*) as count FROM blood_specimen WHERE expiry_date > CURDATE()');
    const [requests] = await db.query('SELECT COUNT(*) as count FROM blood_request WHERE status = "pending"');
    const [warnings] = await db.query('SELECT COUNT(*) as count FROM system_warnings WHERE is_read = FALSE');
    
    res.json({
      totalDonors: donors[0].count,
      totalPatients: patients[0].count,
      totalSpecimens: specimens[0].count,
      pendingRequests: requests[0].count,
      unreadWarnings: warnings[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
  console.log(`✓ Authentication endpoint: http://localhost:${PORT}/api/auth/login`);
});