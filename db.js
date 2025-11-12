const mysql = require('mysql2');

// Create connection pool for better performance
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',           // Change to your MySQL username
  password: 'root',           // Change to your MySQL password
  database: 'BloodBankManagementSystem',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Promisify for async/await usage
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('✓ Connected to MySQL Database');
  connection.release();
});

module.exports = promisePool;