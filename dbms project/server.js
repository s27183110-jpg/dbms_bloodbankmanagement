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

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(__dirname));

// API Routes
app.use('/api/donors', donorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/blood-stock', bloodStockRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/hospitals', hospitalRoutes);

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
    const [specimens] = await db.query('SELECT COUNT(*) as count FROM blood_specimen');
    const [requests] = await db.query('SELECT COUNT(*) as count FROM blood_request WHERE status = "pending"');
    
    res.json({
      totalDonors: donors[0].count,
      totalPatients: patients[0].count,
      totalSpecimens: specimens[0].count,
      pendingRequests: requests[0].count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API available at http://localhost:${PORT}/api`);
});