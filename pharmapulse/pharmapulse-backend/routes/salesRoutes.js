const express = require('express');
const router = express.Router();
const db = require('../config/db');

const authModule = require('../middleware/auth');
const verifyToken = authModule.verifyToken || authModule.authenticateToken || authModule;

// POST /api/sales/checkout - Execute complete sales transaction & FEFO stock deduction
router.post('/checkout', verifyToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { 
      patient_id, 
      prescription_id, 
      items, 
      payment_method, 
      subtotal, 
      tax_amount, 
      discount_amount, 
      grand_total 
    } = req.body;

    const cashier_user_id = req.user.user_id;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required.' });
    }

    await connection.beginTransaction();

    const transaction_number = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [transactionResult] = await connection.execute(
      `INSERT INTO sales_transactions 
        (transaction_number, patient_id, user_id, prescription_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID')`,
      [
        transaction_number, 
        patient_id || null, 
        cashier_user_id, 
        prescription_id || null, 
        subtotal || 0.00, 
        discount_amount || 0.00, 
        tax_amount || 0.00, 
        grand_total || subtotal, 
        payment_method || 'CASH'
      ]
    );

    const transaction_id = transactionResult.insertId;

    for (const item of items) {
      const { drug_id, quantity, unit_price, batch_id, discount_applied } = item;

      const [batchRows] = await connection.execute(
        `SELECT quantity_in_stock FROM inventory_batches WHERE batch_id = ? AND status = 'ACTIVE' FOR UPDATE`,
        [batch_id]
      );

      if (batchRows.length === 0 || batchRows[0].quantity_in_stock < quantity) {
        throw new Error(`Insufficient stock for drug ID ${drug_id} in batch ${batch_id}`);
      }

      await connection.execute(
        `UPDATE inventory_batches SET quantity_in_stock = quantity_in_stock - ? WHERE batch_id = ?`,
        [quantity, batch_id]
      );

      const item_total = (quantity * unit_price) - (discount_applied || 0);
      await connection.execute(
        `INSERT INTO sales_items 
          (transaction_id, batch_id, drug_id, quantity_sold, unit_price, discount_applied, total_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [transaction_id, batch_id, drug_id, quantity, unit_price, discount_applied || 0.00, item_total]
      );
    }

    if (prescription_id) {
      await connection.execute(
        `UPDATE patient_refill_schedules SET status = 'REFILLED', reminder_sent_flag = 1 WHERE patient_id = ? AND status IN ('PENDING', 'REMINDED')`,
        [patient_id]
      );
    }

    if (patient_id) {
      const pointsEarned = Math.floor((grand_total || subtotal) / 10);
      if (pointsEarned > 0) {
        await connection.execute(
          `UPDATE patients SET loyalty_points = loyalty_points + ? WHERE patient_id = ?`,
          [pointsEarned, patient_id]
        );
      }
    }

    await connection.execute(
      `INSERT INTO audit_logs (user_id, action_type, target_table, record_id, action_details, ip_address) 
       VALUES (?, 'POS_CHECKOUT', 'sales_transactions', ?, ?, ?)`,
      [
        cashier_user_id, 
        transaction_id, 
        JSON.stringify({ transaction_number, grand_total: grand_total || subtotal, payment_method, item_count: items.length }), 
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Transaction completed successfully.',
      transaction: {
        transaction_id,
        transaction_number,
        grandTotal: grand_total || subtotal,
        payment_method,
        created_at: new Date()
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Checkout Transaction Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Checkout failed.' });
  } finally {
    connection.release();
  }
});

module.exports = router;