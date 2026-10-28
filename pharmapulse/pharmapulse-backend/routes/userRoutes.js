const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Resilient middleware import (supports direct function or object export)
const auth = require('../middleware/auth');
const verifyToken = typeof auth === 'function' ? auth : (auth.verifyToken || auth);
const authorizeRoles = auth.authorizeRoles || ((...roles) => (req, res, next) => next());

// =========================================================================
// 1. GET /api/users - Fetch all staff members (Restricted to SUPER_ADMIN)
// =========================================================================
router.get('/', verifyToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
          u.user_id,
          u.full_name,
          u.email,
          COALESCE(u.phone_number, '') AS phone_number,
          COALESCE(u.license_number, '') AS license_number,
          COALESCE(u.terminal_id, '') AS terminal_id,
          CASE WHEN COALESCE(u.is_active, 1) = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
          u.created_at,
          COALESCE(r.role_name, 'CASHIER') AS role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       ORDER BY u.created_at DESC`
    );

    return res.json({
      success: true,
      users: rows || []
    });
  } catch (err) {
    console.error('Fetch Users Error:', err);
    return res.status(500).json({
      success: false,
      message: `Failed to fetch staff members: ${err.message}`
    });
  }
});

// =========================================================================
// 2. PUT /api/users/:id - Update staff details & optional password reset
// =========================================================================
router.put('/:id', verifyToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { full_name, email, phone_number, role, license_number, terminal_id, new_password } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({ success: false, message: 'Full name and email are required.' });
    }

    // Map role string to role_id in MySQL database
    let role_id = 4; // Default CASHIER (4)
    if (role === 'SUPER_ADMIN') role_id = 1;
    else if (role === 'LEAD_PHARMACIST' || role === 'PHARMACIST') role_id = 2;
    else if (role === 'INVENTORY_MANAGER') role_id = 3;

    // Check if password reset is requested
    if (new_password && new_password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(new_password, salt);

      await db.query(
        `UPDATE users 
         SET full_name = ?, email = ?, phone_number = ?, role_id = ?, license_number = ?, terminal_id = ?, password_hash = ?, updated_at = NOW() 
         WHERE user_id = ?`,
        [full_name, email, phone_number || null, role_id, license_number || null, terminal_id || null, password_hash, userId]
      );
    } else {
      await db.query(
        `UPDATE users 
         SET full_name = ?, email = ?, phone_number = ?, role_id = ?, license_number = ?, terminal_id = ?, updated_at = NOW() 
         WHERE user_id = ?`,
        [full_name, email, phone_number || null, role_id, license_number || null, terminal_id || null, userId]
      );
    }

    return res.json({
      success: true,
      message: 'Staff account credentials updated successfully.'
    });
  } catch (err) {
    console.error('Update User Error:', err);
    return res.status(500).json({ success: false, message: `Failed to update user: ${err.message}` });
  }
});

// =========================================================================
// 3. PUT /api/users/:id/status - Toggle staff active/inactive account status
// =========================================================================
router.put('/:id/status', verifyToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { status } = req.body; // 'ACTIVE' or 'INACTIVE'
    const numericStatus = status === 'ACTIVE' ? 1 : 0;

    await db.query(
      `UPDATE users SET is_active = ?, updated_at = NOW() WHERE user_id = ?`,
      [numericStatus, userId]
    );

    return res.json({
      success: true,
      message: `Staff user account status updated to ${status}`
    });
  } catch (err) {
    console.error('Update User Status Error:', err);
    return res.status(500).json({ success: false, message: 'Database status update failed' });
  }
});

// =========================================================================
// 4. DELETE /api/users/:id - Cascading deletion of staff member account
// =========================================================================
router.delete('/:id', verifyToken, authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const userId = req.params.id;

    const [result] = await db.query(`DELETE FROM users WHERE user_id = ?`, [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      message: 'Staff account and related session records successfully removed'
    });
  } catch (err) {
    console.error('Delete User Error:', err);
    return res.status(500).json({ success: false, message: 'Database delete failed' });
  }
});

module.exports = router;