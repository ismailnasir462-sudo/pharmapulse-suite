const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

// GET /api/shifts/active - Get current user's active shift
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const [shifts] = await db.query(
      `SELECT cs.*, u.full_name AS cashier_name 
       FROM cashier_shifts cs 
       JOIN users u ON cs.user_id = u.user_id 
       WHERE cs.user_id = ? AND cs.status = 'OPEN' 
       ORDER BY cs.shift_start DESC LIMIT 1`,
      [req.user.userId]
    );

    if (shifts.length === 0) {
      return res.json({ success: true, activeShift: null, message: 'No active shift open' });
    }

    res.json({ success: true, activeShift: shifts[0] });
  } catch (error) {
    console.error('Get Active Shift Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve active shift' });
  }
});

// POST /api/shifts/start - Start a new cashier shift (Clock-in)
router.post('/start', authenticateToken, authorizeRoles('SUPER_ADMIN', 'CASHIER', 'DISPENSING_PHARMACIST'), async (req, res) => {
  try {
    const { cash_register_id, starting_cash_float } = req.body;

    // Check if user already has an open shift
    const [existing] = await db.query(
      `SELECT shift_id FROM cashier_shifts WHERE user_id = ? AND status = 'OPEN'`,
      [req.user.userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have an active open shift.' });
    }

    const floatAmount = starting_cash_float !== undefined ? starting_cash_float : 100.00;
    const registerId = cash_register_id || 'REGISTER-01';

    const [result] = await db.query(
      `INSERT INTO cashier_shifts 
        (user_id, cash_register_id, starting_cash_float, expected_cash_end, status) 
       VALUES (?, ?, ?, ?, 'OPEN')`,
      [req.user.userId, registerId, floatAmount, floatAmount]
    );

    res.status(201).json({
      success: true,
      message: 'Shift started successfully',
      shift_id: result.insertId,
      register_id: registerId,
      starting_float: floatAmount
    });
  } catch (error) {
    console.error('Start Shift Error:', error);
    res.status(500).json({ success: false, message: 'Failed to start shift' });
  }
});

// POST /api/shifts/close - Close active shift and reconcile cash drawer
router.post('/close', authenticateToken, authorizeRoles('SUPER_ADMIN', 'CASHIER', 'DISPENSING_PHARMACIST'), async (req, res) => {
  try {
    const { actual_cash_end, notes } = req.body;

    // Fetch current open shift
    const [shifts] = await db.query(
      `SELECT * FROM cashier_shifts WHERE user_id = ? AND status = 'OPEN' ORDER BY shift_start DESC LIMIT 1`,
      [req.user.userId]
    );

    if (shifts.length === 0) {
      return res.status(400).json({ success: false, message: 'No active shift found to close.' });
    }

    const shift = shifts[0];

    // Calculate total cash sales made during this shift
    const [salesResult] = await db.query(
      `SELECT COALESCE(SUM(total_amount), 0.00) AS total_cash_sales 
       FROM sales_transactions 
       WHERE user_id = ? AND payment_method = 'CASH' AND created_at >= ?`,
      [req.user.userId, shift.shift_start]
    );

    const cashSales = parseFloat(salesResult[0].total_cash_sales);
    const expectedCash = parseFloat(shift.starting_cash_float) + cashSales;
    const actualCash = parseFloat(actual_cash_end || 0.00);
    const variance = actualCash - expectedCash;

    // Update shift record to CLOSED
    await db.query(
      `UPDATE cashier_shifts 
       SET expected_cash_end = ?, actual_cash_end = ?, cash_variance = ?, status = 'CLOSED', shift_end = NOW(), notes = ? 
       WHERE shift_id = ?`,
      [expectedCash, actualCash, variance, notes || null, shift.shift_id]
    );

    res.json({
      success: true,
      message: 'Shift closed and drawer reconciled successfully',
      summary: {
        shift_id: shift.shift_id,
        starting_float: shift.starting_cash_float,
        cash_sales: cashSales,
        expected_cash: expectedCash,
        actual_cash: actualCash,
        variance: variance
      }
    });
  } catch (error) {
    console.error('Close Shift Error:', error);
    res.status(500).json({ success: false, message: 'Failed to close shift' });
  }
});

// GET /api/shifts/history - Fetch shift history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const [shifts] = await db.query(`
      SELECT 
        cs.*, 
        u.full_name AS cashier_name 
      FROM cashier_shifts cs
      JOIN users u ON cs.user_id = u.user_id
      ORDER BY cs.shift_start DESC
      LIMIT 50
    `);

    res.json({ success: true, shifts });
  } catch (error) {
    console.error('Shift History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve shift history' });
  }
});

module.exports = router;