const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Thetiger1!',
  database: process.env.DB_NAME || 'pharmapulse',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Updated config/db.js debug snippet
pool.execute('SELECT DATABASE() AS current_db, CURRENT_USER() AS user_info')
  .then(([rows]) => {
    console.log('--------------------------------------------------');
    console.log('✅ Backend Connected DB Info:', rows[0]);
    console.log('--------------------------------------------------');
  })
  .catch((err) => {
    console.error('❌ Failed to verify database connection:', err.message);
  });


module.exports = pool;