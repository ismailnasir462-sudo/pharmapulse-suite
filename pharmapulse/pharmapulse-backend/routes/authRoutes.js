const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'pharmapulse_jwt_secret';

// Helper function to map string roles to corresponding role_id
const getRoleId = (roleName) => {
  switch (roleName) {
    case 'SUPER_ADMIN': return 1;
    case 'LEAD_PHARMACIST':
    case 'PHARMACIST': return 2;
    case 'CASHIER': return 3;
    case 'INVENTORY_MANAGER': return 4;
    default: return 3;
  }
};

// POST /api/auth/register - Onboard New Staff (Pharmacist, Cashier, Admin)
router.post('/register', async (req, res) => {
  try {
    const { username, full_name, email, password, role, license_number, terminal_id } = req.body;

    const nameToUse = full_name || username;

    if (!email || !password || !nameToUse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and password are required.' 
      });
    }

    // Check if user already exists
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'A user with this email already exists.' 
      });
    }

    // Determine assigned role ID
    const assignedRoleId = getRoleId(role);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user with role_id and staff metadata (license_number, terminal_id)
    const [result] = await db.execute(
      `INSERT INTO users (role_id, full_name, email, password_hash, license_number, terminal_id, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [
        assignedRoleId, 
        nameToUse, 
        email, 
        password_hash, 
        license_number || null, 
        terminal_id || 'POS-01'
      ]
    );

    res.status(201).json({ 
      success: true, 
      message: `${role || 'Staff'} registered successfully`, 
      userId: result.insertId 
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/login - Universal Login with Dynamic Role & Metadata Context
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required.' 
      });
    }

    // Fetch user and join with roles table
    const [users] = await db.execute(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash, u.is_active, u.license_number, u.terminal_id, r.role_name 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.role_id 
       WHERE u.email = ?`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const roleName = user.role_name || 'CASHIER';

    // Sign JWT with user context
    const token = jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email, 
        role: roleName,
        terminal_id: user.terminal_id 
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        user_id: user.user_id, // Backwards compatibility for frontend views
        fullName: user.full_name,
        full_name: user.full_name,
        email: user.email,
        role: roleName,
        licenseNumber: user.license_number,
        terminalId: user.terminal_id
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;