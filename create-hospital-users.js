const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function createHospitalUsers() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',  // ← CHANGE THIS to your MySQL password
    database: 'BloodBankManagementSystem'
  });

  const password = 'hospital123';
  const hashedPassword = await bcrypt.hash(password,     10);

  console.log('Creating hospital users with hashed passwords...\n');

  const users = [
    { hospital_id: 'H00001', username: 'citygeneral', email: 'admin@citygeneral.com' },
    { hospital_id: 'H00002', username: 'metromedical', email: 'admin@metromedical.com' },
    { hospital_id: 'H00003', username: 'community', email: 'admin@communityhealth.com' },
    { hospital_id: 'H00004', username: 'advancedcare', email: 'admin@advancedcare.com' }
  ];

  for (const user of users) {
    try {
      await connection.query(
        `INSERT INTO hospital_users (hospital_id, username, password_hash, email, is_active) 
         VALUES (?, ?, ?, ?, TRUE)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), email = VALUES(email)`,
        [user.hospital_id, user.username, hashedPassword, user.email]
      );
      console.log(`✓ Created/Updated user: ${user.username} (${user.hospital_id})`);
    } catch (error) {
      console.error(`✗ Error creating user ${user.username}:`, error.message);
    }
  }

  console.log('\n✓ All hospital users created successfully!');
  console.log('✓ Password for all users: hospital123');
  console.log('\nYou can now login at: http://localhost:3000/hospital-login.html');
  
  await connection.end();
}

createHospitalUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});