const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Flexible middleware import (handles both authenticateToken and verifyToken named exports)
const authModule = require('../middleware/auth');
const authenticateToken = typeof authModule === 'function' 
  ? authModule 
  : (authModule.authenticateToken || authModule.verifyToken);

// ------------------------------------------------------------------
// 1. GET /api/pos/catalog - Searchable drugs with active FEFO batches
// ------------------------------------------------------------------
router.get('/catalog', authenticateToken, async (req, res) => {
  try {
    const [drugs] = await db.query(`
      SELECT 
        d.drug_id,
        d.brand_name,
        d.generic_name,
        d.dosage_form,
        d.strength,
        d.category,
        d.barcode,
        ib.batch_id,
        ib.batch_number,
        ib.quantity_in_stock,
        ib.selling_price AS unit_price,
        ib.expiry_date
      FROM drugs_master d
      JOIN inventory_batches ib ON d.drug_id = ib.drug_id
      WHERE ib.status = 'ACTIVE' 
        AND ib.quantity_in_stock > 0 
        AND ib.expiry_date > CURDATE()
      ORDER BY ib.expiry_date ASC
    `);

    res.json({ success: true, catalog: drugs });
  } catch (error) {
    console.error('POS Catalog Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Failed to load POS catalog' });
  }
});

// ------------------------------------------------------------------
// 2. GET /api/pos/patients - Search patients for billing & loyalty
// ------------------------------------------------------------------
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    let sql = `SELECT patient_id, patient_code, full_name, phone_number, loyalty_points FROM patients`;
    let params = [];

    if (query) {
      sql += ` WHERE full_name LIKE ? OR phone_number LIKE ? OR patient_code LIKE ?`;
      params = [`%${query}%`, `%${query}%`, `%${query}%`];
    }
    sql += ` ORDER BY full_name ASC LIMIT 20`;

    const [patients] = await db.query(sql, params);
    res.json({ success: true, patients });
  } catch (error) {
    console.error('POS Patients Fetch Error:', error.message || error);
    res.status(500).json({ success: false, message: 'Failed to load patients' });
  }
});

// ------------------------------------------------------------------
// 3. GET /api/pos/transactions - Searchable & Filterable Sales History
// ------------------------------------------------------------------
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const { 
      search, 
      dateFilter, 
      startDate, 
      endDate, 
      paymentMethod, 
      minPrice, 
      maxPrice, 
      priceSort 
    } = req.query;

    let query = `
      SELECT 
        st.transaction_id,
        st.transaction_number,
        st.subtotal,
        st.tax_amount,
        st.discount_amount,
        st.total_amount AS grand_total,
        st.payment_method,
        st.created_at,
        COALESCE(p.full_name, 'Walk-in Customer') AS patient_name,
        COALESCE(u.full_name, 'System Admin') AS cashier_name
      FROM sales_transactions st
      LEFT JOIN patients p ON st.patient_id = p.patient_id
      LEFT JOIN users u ON st.user_id = u.user_id
      WHERE 1=1
    `;

    const params = [];

    // 1. Keyword Search (Txn #, Patient Name, Cashier Name)
    if (search && search.trim() !== '') {
      query += ` AND (st.transaction_number LIKE ? OR p.full_name LIKE ? OR u.full_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    // 2. Date Filtering
    if (dateFilter === 'TODAY') {
      query += ` AND DATE(st.created_at) = CURDATE()`;
    } else if (dateFilter === 'YESTERDAY') {
      query += ` AND DATE(st.created_at) = SUBDATE(CURDATE(), 1)`;
    } else if (dateFilter === 'CUSTOM' && startDate && endDate) {
      query += ` AND st.created_at BETWEEN ? AND ?`;
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // 3. Payment Method Filter
    if (paymentMethod && paymentMethod !== 'ALL') {
      query += ` AND st.payment_method = ?`;
      params.push(paymentMethod);
    }

    // 4. Min/Max Price Filters
    if (minPrice && !isNaN(parseFloat(minPrice))) {
      query += ` AND st.total_amount >= ?`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      query += ` AND st.total_amount <= ?`;
      params.push(parseFloat(maxPrice));
    }

    // 5. Price / Date Sorting
    if (priceSort === 'HIGH_TO_LOW') {
      query += ` ORDER BY st.total_amount DESC`;
    } else if (priceSort === 'LOW_TO_HIGH') {
      query += ` ORDER BY st.total_amount ASC`;
    } else {
      query += ` ORDER BY st.created_at DESC`;
    }

    query += ` LIMIT 100`;

    const [transactions] = await db.query(query, params);

    // Fetch associated line items for each transaction
    for (let txn of transactions) {
      const [items] = await db.query(`
        SELECT 
          si.drug_id,
          d.brand_name,
          d.generic_name,
          si.quantity_sold,
          si.unit_price,
          si.discount_applied
        FROM sales_items si
        JOIN drugs_master d ON si.drug_id = d.drug_id
        WHERE si.transaction_id = ?
      `, [txn.transaction_id]);

      txn.items = items;
    }

    res.json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    console.error('Fetch POS Transactions Error:', error.message || error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to retrieve sales transactions history.' 
    });
  }
});

// ------------------------------------------------------------------
// 4. POST /api/pos/checkout - Complete Atomic POS Sales Transaction
// ------------------------------------------------------------------
router.post('/checkout', authenticateToken, async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { 
      patient_id, 
      prescription_id, 
      items, 
      payment_method, 
      subtotal: rawSubtotal, 
      discount_amount, 
      tax_amount,
      grand_total
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items are required.' });
    }

    const cashier_user_id = req.user.user_id || req.user.userId || 1;

    // 1. Resolve patient identifier (Numeric ID or String Code like 'PAT-1001')
    let parsedPatientId = null;
    if (patient_id) {
      const numericId = parseInt(patient_id, 10);
      if (!isNaN(numericId)) {
        parsedPatientId = numericId;
      } else {
        const [pRows] = await connection.execute(
          'SELECT patient_id FROM patients WHERE patient_code = ? OR full_name = ?', 
          [patient_id, patient_id]
        );
        if (pRows.length > 0) parsedPatientId = pRows[0].patient_id;
      }
    }

    // 2. Compute financial values safely
    let calculatedSubtotal = 0;
    items.forEach(item => {
      const price = parseFloat(item.unit_price || 0);
      const qty = item.quantity_sold || item.quantity || 1;
      const discount = parseFloat(item.discount_applied || 0);
      calculatedSubtotal += (price * qty) - discount;
    });

    const subtotal = rawSubtotal !== undefined ? parseFloat(rawSubtotal) : calculatedSubtotal;
    const tax = tax_amount !== undefined ? parseFloat(tax_amount) : (subtotal * 0.05);
    const discount = discount_amount ? parseFloat(discount_amount) : 0.00;
    const computedGrandTotal = grand_total !== undefined ? parseFloat(grand_total) : (subtotal + tax - discount);
    
    const transaction_number = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 3. Insert Sales Header
    const [txnResult] = await connection.execute(
      `INSERT INTO sales_transactions 
        (transaction_number, patient_id, user_id, prescription_id, subtotal, discount_amount, tax_amount, total_amount, payment_method, payment_status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID')`,
      [
        transaction_number, 
        parsedPatientId, 
        cashier_user_id, 
        prescription_id ? (parseInt(String(prescription_id).replace(/\D/g, ''), 10) || null) : null, 
        subtotal, 
        discount, 
        tax, 
        computedGrandTotal, 
        payment_method || 'CASH'
      ]
    );

    const transaction_id = txnResult.insertId;

    // 4. Process Line Items & Perform FEFO Stock Deduction
    for (const item of items) {
      const drugId = item.drug_id;
      const batchId = item.batch_id || 1;
      const qty = item.quantity_sold || item.quantity || 1;
      const price = parseFloat(item.unit_price || 0);
      const itemDiscount = parseFloat(item.discount_applied || 0);
      const itemTotal = (qty * price) - itemDiscount;

      // Lock row and check available batch stock
      const [batchRows] = await connection.execute(
        `SELECT quantity_in_stock FROM inventory_batches WHERE batch_id = ? AND status = 'ACTIVE' FOR UPDATE`,
        [batchId]
      );

      if (batchRows.length === 0 || batchRows[0].quantity_in_stock < qty) {
        throw new Error(`Insufficient stock for drug batch ID ${batchId}`);
      }

      // Deduct quantity from inventory batch
      await connection.execute(
        `UPDATE inventory_batches SET quantity_in_stock = GREATEST(0, quantity_in_stock - ?) WHERE batch_id = ?`,
        [qty, batchId]
      );

      // Insert line item
      await connection.execute(
        `INSERT INTO sales_items 
          (transaction_id, batch_id, drug_id, quantity_sold, unit_price, discount_applied, total_price) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [transaction_id, batchId, drugId, qty, price, itemDiscount, itemTotal]
      );
    }

    // 5. Decrement Refill Count if linked to a prescription
    if (prescription_id) {
      const rxNum = String(prescription_id);
      await connection.execute(
        `UPDATE prescriptions 
         SET refills_remaining = GREATEST(0, refills_remaining - 1) 
         WHERE prescription_number = ? OR prescription_id = ?`,
        [rxNum, parseInt(rxNum.replace(/\D/g, ''), 10) || 0]
      );
    }

    // 6. Award Patient Loyalty Points (1 point per GHS 10 spent)
    if (parsedPatientId) {
      const pointsEarned = Math.floor(computedGrandTotal / 10);
      if (pointsEarned > 0) {
        await connection.execute(
          `UPDATE patients SET loyalty_points = loyalty_points + ? WHERE patient_id = ?`,
          [pointsEarned, parsedPatientId]
        );
      }
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'Checkout completed successfully.',
      transaction_number,
      transaction_id,
      total_amount: computedGrandTotal,
      transaction: {
        transaction_id,
        transaction_number,
        grand_total: computedGrandTotal,
        payment_method: payment_method || 'CASH',
        created_at: new Date()
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('Checkout Error:', error.message || error);
    return res.status(500).json({ success: false, message: error.message || 'Checkout transaction failed' });
  } finally {
    connection.release();
  }
});

module.exports = router;