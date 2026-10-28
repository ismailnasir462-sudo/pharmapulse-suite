const express = require('express');
const router = express.Router();
const db = require('../config/db'); // MySQL / MariaDB connection pool
const jwt = require('jsonwebtoken');

// Auth Middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied: No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pharmapulse_secret_key');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ==========================================
// 1. GET /api/inventory/expiry-matrix
// Retrieves FEFO inventory batches with risk level classification
// ==========================================
router.get('/expiry-matrix', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        b.batch_id,
        b.batch_number,
        b.drug_id,
        d.brand_name,
        d.generic_name,
        d.strength,
        s.supplier_name,
        b.storage_location,
        b.quantity_in_stock,
        b.cost_price,
        b.selling_price,
        b.discount_percentage,
        b.status,
        b.manufacture_date,
        b.expiry_date,
        DATEDIFF(b.expiry_date, CURDATE()) AS days_to_expiry,
        CASE 
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 30 THEN 'CRITICAL'
          WHEN DATEDIFF(b.expiry_date, CURDATE()) <= 90 THEN 'WARNING'
          ELSE 'HEALTHY'
        END AS risk_level
      FROM inventory_batches b
      JOIN drugs_master d ON b.drug_id = d.drug_id
      LEFT JOIN suppliers s ON b.supplier_id = s.supplier_id
      WHERE b.quantity_in_stock > 0
      ORDER BY b.expiry_date ASC;
    `;

    const [batches] = await db.execute(query);
    res.json({ success: true, batches });
  } catch (error) {
    console.error('Error fetching expiry matrix:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory batches.' });
  }
});

// ==========================================
// 2. POST /api/inventory/ingest-batch
// Ingests a new incoming stock batch
// ==========================================
router.post('/ingest-batch', verifyToken, async (req, res) => {
  try {
    const { 
      drug_id, 
      supplier_id, 
      batch_number, 
      quantity_in_stock, 
      purchase_cost,
      cost_price,
      selling_price, 
      discount_percentage,
      manufacture_date, 
      expiry_date, 
      storage_location 
    } = req.body;

    if (!drug_id || !batch_number || !quantity_in_stock || !expiry_date || !selling_price) {
      return res.status(400).json({ success: false, message: 'Please fill in all mandatory batch fields.' });
    }

    const query = `
      INSERT INTO inventory_batches 
        (drug_id, supplier_id, batch_number, quantity_in_stock, cost_price, selling_price, discount_percentage, manufacture_date, expiry_date, storage_location, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
    `;

    const [result] = await db.execute(query, [
      drug_id,
      supplier_id || null,
      batch_number,
      quantity_in_stock,
      cost_price || purchase_cost || 0.00,
      selling_price,
      discount_percentage || 0.00,
      manufacture_date || null,
      expiry_date,
      storage_location || 'Aisle-1'
    ]);

    res.status(201).json({
      success: true,
      message: 'New inventory batch ingested successfully.',
      batch_id: result.insertId
    });
  } catch (error) {
    console.error('Error ingesting batch:', error);
    res.status(500).json({ success: false, message: 'Failed to ingest batch into inventory.' });
  }
});

// ==========================================
// 3. POST /api/inventory/adjust-stock
// Adjusts stock (damages, write-offs, audit corrections) & creates audit log
// ==========================================
router.post('/adjust-stock', verifyToken, async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { batch_id, quantity_deducted, reason, notes } = req.body;
    const userId = req.user.user_id || req.user.id || 1;

    if (!batch_id || !quantity_deducted || quantity_deducted <= 0) {
      return res.status(400).json({ success: false, message: 'Valid batch ID and deduction quantity are required.' });
    }

    // Check batch stock
    const [batchRows] = await connection.execute(
      `SELECT batch_id, drug_id, batch_number, quantity_in_stock FROM inventory_batches WHERE batch_id = ?`,
      [batch_id]
    );

    if (batchRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Target batch not found.' });
    }

    const currentBatch = batchRows[0];
    if (currentBatch.quantity_in_stock < quantity_deducted) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Deduction quantity exceeds current stock.' });
    }

    // 1. Update inventory batch
    await connection.execute(
      `UPDATE inventory_batches 
       SET quantity_in_stock = quantity_in_stock - ?,
           status = CASE WHEN (quantity_in_stock - ?) <= 0 THEN 'DEPLETED' ELSE status END
       WHERE batch_id = ?`,
      [quantity_deducted, quantity_deducted, batch_id]
    );

    // 2. Insert into audit logs
    await connection.execute(
      `INSERT INTO stock_audit_logs (batch_id, user_id, reason, quantity_deducted, notes, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [batch_id, userId, reason || 'DAMAGED', quantity_deducted, notes || null]
    );

    await connection.commit();
    res.json({ success: true, message: 'Stock deduction and audit log recorded successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, message: 'Failed to process stock adjustment.' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 4. GET & POST /api/inventory/suppliers
// Supplier Catalog management
// ==========================================
router.get('/suppliers', verifyToken, async (req, res) => {
  try {
    const [suppliers] = await db.execute(`SELECT * FROM suppliers ORDER BY supplier_id DESC`);
    res.json({ success: true, suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers.' });
  }
});

router.post('/suppliers', verifyToken, async (req, res) => {
  try {
    const { supplier_name, contact_person, phone, email, address, lead_time_days } = req.body;

    if (!supplier_name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required.' });
    }

    const [result] = await db.execute(
      `INSERT INTO suppliers (supplier_name, contact_person, phone, email, address, lead_time_days)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        supplier_name,
        contact_person || null,
        phone || null,
        email || null,
        address || null,
        lead_time_days || 3
      ]
    );

    res.status(201).json({ success: true, message: 'Supplier registered successfully.', supplier_id: result.insertId });
  } catch (error) {
    console.error('Error adding supplier:', error);
    res.status(500).json({ success: false, message: 'Failed to register supplier.' });
  }
});

// ==========================================
// 5. GET & POST /api/inventory/purchase-orders
// Purchase Order Restocking
// ==========================================
router.get('/purchase-orders', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        po.po_id,
        po.po_number,
        po.supplier_id,
        s.supplier_name,
        po.drug_id,
        d.brand_name,
        po.order_quantity,
        po.estimated_cost,
        po.status,
        po.created_at
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      JOIN drugs_master d ON po.drug_id = d.drug_id
      ORDER BY po.po_id DESC;
    `;
    const [purchase_orders] = await db.execute(query);
    res.json({ success: true, purchase_orders });
  } catch (error) {
    console.error('Error fetching POs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Purchase Orders.' });
  }
});

router.post('/purchase-orders', verifyToken, async (req, res) => {
  try {
    const { supplier_id, drug_id, order_quantity, estimated_cost } = req.body;

    if (!supplier_id || !drug_id || !order_quantity) {
      return res.status(400).json({ success: false, message: 'Supplier, Drug, and Quantity are required.' });
    }

    const po_number = `PO-${Math.floor(10000 + Math.random() * 90000)}`;

    const [result] = await db.execute(
      `INSERT INTO purchase_orders (po_number, supplier_id, drug_id, order_quantity, estimated_cost, status)
       VALUES (?, ?, ?, ?, ?, 'SENT')`,
      [po_number, supplier_id, drug_id, order_quantity, estimated_cost || 0.00]
    );

    res.status(201).json({ success: true, message: 'Purchase Order issued successfully.', po_id: result.insertId });
  } catch (error) {
    console.error('Error creating PO:', error);
    res.status(500).json({ success: false, message: 'Failed to generate Purchase Order.' });
  }
});

// ==========================================
// 6. GET /api/inventory/audit-logs
// Audit history for stock write-offs and deductions
// ==========================================
router.get('/audit-logs', verifyToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        a.log_id,
        a.created_at,
        b.batch_number,
        d.brand_name,
        a.reason,
        a.quantity_deducted,
        a.notes,
        u.full_name AS adjusted_by_name
      FROM stock_audit_logs a
      JOIN inventory_batches b ON a.batch_id = b.batch_id
      JOIN drugs_master d ON b.drug_id = d.drug_id
      LEFT JOIN users u ON a.user_id = u.user_id
      ORDER BY a.log_id DESC
      LIMIT 100;
    `;
    const [audit_logs] = await db.execute(query);
    res.json({ success: true, audit_logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stock audit logs.' });
  }
});

// ==========================================
// 7. GET /api/inventory/drugs
// Medication catalog dropdown options
// ==========================================
// GET /api/inventory/drugs - Catalog Options with Baseline Prices
router.get('/drugs', verifyToken, async (req, res) => {
  try {
    const [drugs] = await db.execute(`
      SELECT 
        d.drug_id, 
        d.brand_name, 
        d.generic_name, 
        d.strength, 
        d.reorder_level,
        d.default_unit_cost,
        d.default_selling_price,
        d.default_storage_location,
        COALESCE(SUM(b.quantity_in_stock), 0) AS total_stock 
      FROM drugs_master d 
      LEFT JOIN inventory_batches b ON d.drug_id = b.drug_id 
      GROUP BY d.drug_id 
      ORDER BY d.brand_name ASC
    `);
    res.json({ success: true, drugs });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch drugs catalog.' });
  }
});

module.exports = router;