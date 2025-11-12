const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// =====================================================
// Hospital Login
// =====================================================
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get hospital user
    const [users] = await db.query(
      'SELECT * FROM hospital_users WHERE username = ? AND is_active = TRUE',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await db.query(
      'UPDATE hospital_users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    // Get hospital details
    const [hospitals] = await db.query(
      'SELECT * FROM hospital WHERE hospital_id = ?',
      [user.hospital_id]
    );

    // Create JWT token
    const token = jwt.sign(
      { 
        user_id: user.user_id,
        hospital_id: user.hospital_id,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        hospital_id: user.hospital_id,
        hospital_name: hospitals[0].name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Hospital Logout
// =====================================================
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// =====================================================
// Verify Token
// =====================================================
router.get('/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// =====================================================
// Get Current User Info
// =====================================================
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT hu.user_id, hu.username, hu.email, hu.hospital_id, hu.last_login,
              h.name as hospital_name, h.address, h.phone_number
       FROM hospital_users hu
       JOIN hospital h ON hu.hospital_id = h.hospital_id
       WHERE hu.user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// Middleware: Authenticate Token
// =====================================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Export middleware for use in other routes
router.authenticateToken = authenticateToken;

module.exports = router;