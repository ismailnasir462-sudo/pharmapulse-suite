const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const db = require('../config/db');
const verifyToken = require('../middleware/auth');

// Configure multer temporary upload destination
const upload = multer({ dest: 'uploads/drug_scans/' });

// POST /api/ai/identify-drug - Optical Packaging Scanner Gateway
router.post('/identify-drug', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided.' });
    }

    // 1. Forward image stream to Python FastAPI service on port 8001
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), req.file.originalname);

    const aiRes = await axios.post('http://localhost:8001/scan-packaging', formData, {
      headers: { ...formData.getHeaders() }
    });

    // Cleanup temporary upload file
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }

    if (!aiRes.data || !aiRes.data.success) {
      return res.status(500).json({
        success: false,
        message: aiRes.data?.message || 'AI vision microservice failed to process image.'
      });
    }

    const aiData = aiRes.data.data || {};
    const rawBrandName = (aiData.brand_name || '').trim();
    const rawActiveIngredient = (aiData.active_ingredient || aiData.generic_name || '').trim();

    let matchedDrug = null;
    let matchType = null;

    // Clean brand name token (e.g., "Lonart DS" or "Lonart 80/480" -> "Lonart")
    const brandToken = rawBrandName.replace(/[\d\/+mg\s]+/gi, ' ').trim().split(' ')[0];

    // =========================================================================
    // PRIORITY 1: BRAND NAME / PRODUCT MATCH (LONART DS CHECK FIRST)
    // =========================================================================
    if (brandToken && brandToken.toLowerCase() !== 'null' && brandToken.length >= 3) {
      const [brandRows] = await db.query(
        `SELECT 
            d.drug_id,
            d.brand_name,
            d.generic_name,
            d.active_ingredient,
            d.strength,
            d.dosage_form,
            COALESCE(b.batch_id, 1) AS batch_id,
            COALESCE(b.batch_number, 'DEFAULT-BATCH') AS batch_number,
            COALESCE(b.selling_price, 40.00) AS unit_price,
            COALESCE(b.selling_price, 40.00) AS selling_price,
            COALESCE(b.quantity_in_stock, 0) AS quantity_in_stock
         FROM drugs_master d
         LEFT JOIN inventory_batches b ON d.drug_id = b.drug_id
         WHERE (d.brand_name COLLATE utf8mb4_unicode_ci LIKE ? 
            OR d.brand_name COLLATE utf8mb4_unicode_ci LIKE ?)
         ORDER BY b.quantity_in_stock DESC, b.created_at DESC
         LIMIT 1`,
        [`%${rawBrandName}%`, `%${brandToken}%`]
      );

      if (brandRows && brandRows.length > 0) {
        matchedDrug = brandRows[0];
        matchType = 'EXACT_BRAND_NAME';
      }
    }

    // =========================================================================
    // PRIORITY 2: FALLBACK TO INGREDIENT MATCH ONLY IF BRAND IS TOTALLY UNKNOWN
    // =========================================================================
    if (!matchedDrug && rawActiveIngredient && rawActiveIngredient.toLowerCase() !== 'null') {
      const tokens = rawActiveIngredient
        .split(/[,/+\s]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 2);

      if (tokens.length > 0) {
        const dynamicWhere = tokens
          .map(() => `(d.active_ingredient COLLATE utf8mb4_unicode_ci LIKE ? OR d.generic_name COLLATE utf8mb4_unicode_ci LIKE ?)`)
          .join(' OR ');

        const queryParams = [];
        tokens.forEach((token) => {
          queryParams.push(`%${token}%`, `%${token}%`);
        });

        const [ingredientRows] = await db.query(
          `SELECT 
              d.drug_id,
              d.brand_name,
              d.generic_name,
              d.active_ingredient,
              d.strength,
              d.dosage_form,
              COALESCE(b.batch_id, 1) AS batch_id,
              COALESCE(b.batch_number, 'DEFAULT-BATCH') AS batch_number,
              COALESCE(b.selling_price, 40.00) AS unit_price,
              COALESCE(b.selling_price, 40.00) AS selling_price,
              COALESCE(b.quantity_in_stock, 0) AS quantity_in_stock
           FROM drugs_master d
           LEFT JOIN inventory_batches b ON d.drug_id = b.drug_id
           WHERE ${dynamicWhere}
           ORDER BY b.quantity_in_stock DESC, b.created_at DESC
           LIMIT 1`,
          queryParams
        );

        if (ingredientRows && ingredientRows.length > 0) {
          matchedDrug = ingredientRows[0];
          matchType = 'GENERIC_SUBSTITUTE_FALLBACK';
        }
      }
    }

    const searchSummary = rawBrandName || rawActiveIngredient || 'Medication';

    return res.json({
      success: true,
      ai_extracted: aiData,
      matched_drug: matchedDrug,
      match_type: matchType,
      message: matchedDrug
        ? `Matched store item by ${matchType === 'EXACT_BRAND_NAME' ? 'Product Name (' + matchedDrug.brand_name + ')' : 'Active Ingredient (' + matchedDrug.active_ingredient + ')'} with ${matchedDrug.quantity_in_stock} units.`
        : `Extracted specifications (${searchSummary}), but no matching drug or active batch was found in stock.`
    });

  } catch (err) {
    console.error('Express AI Gateway Error:', err.message);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    return res.status(500).json({
      success: false,
      message: `Failed to identify drug package: ${err.message}`
    });
  }
});

module.exports = router;