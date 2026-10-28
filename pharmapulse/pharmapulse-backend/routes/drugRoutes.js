const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

// GET /api/drugs - Search catalog or barcode
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT d.*, COALESCE(b.selling_price, 15.00) as selling_price, COALESCE(b.batch_id, 1) as batch_id
      FROM drugs_master d
      LEFT JOIN inventory_batches b ON d.drug_id = b.drug_id
    `;
    let params = [];

    if (search && search.trim() !== '') {
      query += ` WHERE d.brand_name LIKE ? OR d.generic_name LIKE ? OR d.barcode = ?`;
      const term = `%${search.trim()}%`;
      params = [term, term, search.trim()];
    }

    query += ` GROUP BY d.drug_id LIMIT 20`;
    const [drugs] = await db.execute(query, params);

    res.json({ success: true, drugs });
  } catch (error) {
    console.error('Error searching drugs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/drugs/:id/substitutes - Generic substitutes
router.get('/:id/substitutes', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [target] = await db.execute('SELECT active_ingredient FROM drugs_master WHERE drug_id = ?', [id]);
    if (target.length === 0) return res.status(404).json({ success: false, message: 'Drug not found' });

    const [substitutes] = await db.execute(
      `SELECT d.drug_id, d.brand_name, d.generic_name, d.strength, b.batch_id, b.selling_price
       FROM drugs_master d
       JOIN inventory_batches b ON d.drug_id = b.drug_id
       WHERE d.active_ingredient = ? AND d.drug_id != ? AND b.quantity_in_stock > 0
       LIMIT 4`,
      [target[0].active_ingredient, id]
    );

    res.json({ success: true, inStockSubstitutes: substitutes });
  } catch (error) {
    console.error('Error finding substitutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;