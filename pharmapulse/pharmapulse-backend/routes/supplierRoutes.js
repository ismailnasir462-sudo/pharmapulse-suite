const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');

// GET /api/suppliers - Fetch all suppliers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [suppliers] = await db.execute('SELECT * FROM suppliers ORDER BY company_name ASC');
        res.json({ success: true, suppliers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/suppliers - Add new supplier
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { company_name, contact_person, phone_number, email, address, payment_terms } = req.body;

        if (!company_name) {
            return res.status(400).json({ error: 'Company name is required' });
        }

        const [result] = await db.execute(
            `INSERT INTO suppliers (company_name, contact_person, phone_number, email, address, payment_terms) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [company_name, contact_person || null, phone_number || null, email || null, address || null, payment_terms || 'COD']
        );

        res.status(201).json({ success: true, message: 'Supplier added successfully', supplierId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/suppliers/po - Create a Purchase Order
router.post('/po', authenticateToken, async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { supplier_id, items } = req.body; // items: [{ drug_id, quantity_ordered, unit_cost_price }]

        if (!supplier_id || !items || items.length === 0) {
            return res.status(400).json({ error: 'Supplier and order items are required' });
        }

        const po_number = `PO-${Date.now()}`;
        let total_amount = 0;

        items.forEach(item => {
            total_amount += item.quantity_ordered * item.unit_cost_price;
        });

        // Insert PO header
        const [poResult] = await connection.execute(
            `INSERT INTO purchase_orders (supplier_id, created_by_user_id, po_number, total_amount) VALUES (?, ?, ?, ?)`,
            [supplier_id, req.user.user_id, po_number, total_amount]
        );

        const po_id = poResult.insertId;

        // Insert PO items
        for (const item of items) {
            await connection.execute(
                `INSERT INTO purchase_order_items (po_id, drug_id, quantity_ordered, unit_cost_price) VALUES (?, ?, ?, ?)`,
                [po_id, item.drug_id, item.quantity_ordered, item.unit_cost_price]
            );
        }

        await connection.commit();
        res.status(201).json({ success: true, po_number, po_id, total_amount });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;