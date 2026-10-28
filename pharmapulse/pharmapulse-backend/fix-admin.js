const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function fixSuperAdmin() {
  try {
    const email = 'admin@pharmapulse.com';
    const plainPassword = 'Admin@1234';

    // 1. Generate hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    // 2. Ensure Role 1 exists in `roles` table
    await db.execute(
      `INSERT INTO roles (role_id, role_name, description) 
       VALUES (1, 'SUPER_ADMIN', 'Full system control') 
       ON DUPLICATE KEY UPDATE role_name = 'SUPER_ADMIN'`
    );

    // 3. Upsert Super Admin user
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);

    if (existing.length === 0) {
      await db.execute(
        `INSERT INTO users (role_id, full_name, email, password_hash, is_active) 
         VALUES (1, 'System Administrator', ?, ?, 1)`,
        [email, hash]
      );
      console.log('✅ Super Admin account CREATED successfully.');
    } else {
      await db.execute(
        `UPDATE users 
         SET password_hash = ?, role_id = 1, is_active = 1 
         WHERE email = ?`,
        [hash, email]
      );
      console.log('✅ Super Admin password & role UPDATED successfully.');
    }

    // 4. Verify test match
    const isMatch = await bcrypt.compare(plainPassword, hash);
    console.log(`🔑 Bcrypt Verification Test: ${isMatch ? 'PASSED' : 'FAILED'}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing admin account:', err);
    process.exit(1);
  }
}

fixSuperAdmin();