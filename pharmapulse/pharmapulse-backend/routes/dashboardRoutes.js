const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

// GET /api/dashboard/stats - Real-time system performance & KPI metrics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 1. Sales summary (Today's revenue, transaction count, total sales)
    const [[salesSummary]] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total_amount ELSE 0 END), 0.00) AS today_revenue,
        COALESCE(COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END), 0) AS today_transactions,
        COALESCE(SUM(total_amount), 0.00) AS total_revenue_all_time,
        COALESCE(COUNT(transaction_id), 0) AS total_transactions_all_time
      FROM sales_transactions
    `);

    // 2. Inventory health metrics
    const [[inventoryStats]] = await db.query(`
      SELECT 
        COUNT(DISTINCT drug_id) AS total_drug_products,
        COALESCE(SUM(quantity_in_stock), 0) AS total_units_in_stock,
        COALESCE(SUM(quantity_in_stock * selling_price), 0.00) AS total_stock_value
      FROM inventory_batches
      WHERE status != 'DISCARDED'
    `);

    // 3. Low stock alert items (Products where total stock <= reorder_level)
    const [lowStockItems] = await db.query(`
      SELECT 
        d.drug_id,
        d.brand_name,
        d.generic_name,
        d.reorder_level,
        COALESCE(SUM(ib.quantity_in_stock), 0) AS current_stock
      FROM drugs_master d
      LEFT JOIN inventory_batches ib ON d.drug_id = ib.drug_id AND ib.status != 'DISCARDED'
      GROUP BY d.drug_id, d.brand_name, d.generic_name, d.reorder_level
      HAVING current_stock <= d.reorder_level
      ORDER BY current_stock ASC
      LIMIT 10
    `);

    // 4. Expiring / Near expiry batches (Expiring within 60 days)
    const [expiringBatches] = await db.query(`
      SELECT 
        ib.batch_id,
        d.brand_name,
        ib.batch_number,
        ib.quantity_in_stock,
        ib.expiry_date,
        DATEDIFF(ib.expiry_date, CURDATE()) AS days_until_expiry
      FROM inventory_batches ib
      JOIN drugs_master d ON ib.drug_id = d.drug_id
      WHERE ib.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
        AND ib.quantity_in_stock > 0
        AND ib.status != 'DISCARDED'
      ORDER BY ib.expiry_date ASC
      LIMIT 10
    `);

    // 5. Prescriptions summary
    const [[rxSummary]] = await db.query(`
      SELECT 
        COUNT(*) AS total_prescriptions,
        COUNT(CASE WHEN status = 'PENDING_VERIFICATION' THEN 1 END) AS pending_verification,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active_prescriptions,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_prescriptions
      FROM prescriptions
    `);

    // 6. Registered patients count
    const [[patientCount]] = await db.query(`
      SELECT COUNT(*) AS total_patients FROM patients
    `);

    // 7. Recent transactions stream (Last 5 transactions)
    const [recentSales] = await db.query(`
      SELECT 
        st.transaction_number,
        COALESCE(p.full_name, 'Walk-in Customer') AS patient_name,
        st.total_amount,
        st.payment_method,
        st.created_at
      FROM sales_transactions st
      LEFT JOIN patients p ON st.patient_id = p.patient_id
      ORDER BY st.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        sales: {
          todayRevenue: parseFloat(salesSummary.today_revenue),
          todayTransactions: parseInt(salesSummary.today_transactions, 10),
          totalRevenue: parseFloat(salesSummary.total_revenue_all_time),
          totalTransactions: parseInt(salesSummary.total_transactions_all_time, 10)
        },
        inventory: {
          totalProducts: parseInt(inventoryStats.total_drug_products, 10),
          totalStockUnits: parseInt(inventoryStats.total_units_in_stock, 10),
          totalStockValue: parseFloat(inventoryStats.total_stock_value),
          lowStockAlertsCount: lowStockItems.length,
          expiringBatchesCount: expiringBatches.length,
          lowStockItems,
          expiringBatches
        },
        prescriptions: {
          total: parseInt(rxSummary.total_prescriptions, 10),
          pendingVerification: parseInt(rxSummary.pending_verification, 10),
          active: parseInt(rxSummary.active_prescriptions, 10),
          completed: parseInt(rxSummary.completed_prescriptions, 10)
        },
        patients: {
          total: parseInt(patientCount.total_patients, 10)
        },
        recentSales
      }
    });
  } catch (error) {
    console.error('Dashboard Stats Query Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve live dashboard metrics.'
    });
  }
});

module.exports = router;