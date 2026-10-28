const express = require('express');
const router = express.Router();
const db = require('../config/db');
const authenticateToken = require('../middleware/auth');
const authorizeRoles = require('../middleware/authorizeRoles');

// GET /api/prescriptions - Fetch all prescriptions with patient details
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [prescriptions] = await db.query(`
      SELECT 
        p.*,
        pat.full_name AS patient_name,
        pat.patient_code,
        pat.phone_number AS patient_phone,
        u.full_name AS verified_by_name
      FROM prescriptions p
      LEFT JOIN patients pat ON p.patient_id = pat.patient_id
      LEFT JOIN users u ON p.verified_by_user_id = u.user_id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, prescriptions });
  } catch (error) {
    console.error('Fetch Prescriptions Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve prescriptions' });
  }
});

// GET /api/prescriptions/:id - Fetch single prescription with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [prescriptions] = await db.query(
      `SELECT p.*, pat.full_name AS patient_name, pat.patient_code 
       FROM prescriptions p 
       LEFT JOIN patients pat ON p.patient_id = pat.patient_id 
       WHERE p.prescription_id = ?`,
      [id]
    );

    if (prescriptions.length === 0) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    const [items] = await db.query(
      `SELECT pi.*, d.brand_name, d.generic_name, d.strength, d.dosage_form 
       FROM prescription_items pi 
       JOIN drugs_master d ON pi.drug_id = d.drug_id 
       WHERE pi.prescription_id = ?`,
      [id]
    );

    res.json({ success: true, prescription: prescriptions[0], items });
  } catch (error) {
    console.error('Fetch Single Prescription Error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve prescription details' });
  }
});

// POST /api/prescriptions - Create new prescription with items
router.post('/', authenticateToken, authorizeRoles('SUPER_ADMIN', 'LEAD_PHARMACIST', 'DISPENSING_PHARMACIST'), async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const {
      patient_id,
      prescriber_name,
      prescriber_license_no,
      hospital_clinic_name,
      prescription_image_url,
      ocr_raw_text,
      notes,
      refills_authorized,
      issue_date,
      items
    } = req.body;

    if (!patient_id || !prescriber_name || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Patient, prescriber, and prescription items are required' });
    }

    const prescription_number = `RX-GH-${Date.now()}`;
    const refills = refills_authorized || 1;

    // Insert prescription header
    const [rxResult] = await connection.execute(
      `INSERT INTO prescriptions 
        (prescription_number, patient_id, prescriber_name, prescriber_license_no, hospital_clinic_name, prescription_image_url, ocr_raw_text, notes, status, refills_authorized, refills_remaining, verified_by_user_id, issue_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
      [
        prescription_number,
        patient_id,
        prescriber_name,
        prescriber_license_no || null,
        hospital_clinic_name || null,
        prescription_image_url || null,
        ocr_raw_text || null,
        notes || null,
        refills,
        refills,
        req.user.userId,
        issue_date || new Date().toISOString().split('T')[0]
      ]
    );

    const prescription_id = rxResult.insertId;

    // Insert line items
    for (const item of items) {
      await connection.execute(
        `INSERT INTO prescription_items 
          (prescription_id, drug_id, dosage_instructions, quantity_prescribed, quantity_dispensed) 
         VALUES (?, ?, ?, ?, ?)`,
        [prescription_id, item.drug_id, item.dosage_instructions, item.quantity_prescribed, item.quantity_dispensed || 0]
      );
    }

    await connection.commit();
    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription_number,
      prescription_id
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create Prescription Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Prescription creation failed' });
  } finally {
    connection.release();
  }
});

// PATCH /api/prescriptions/:id/status - Update prescription status (VERIFY/DISPENSE/CANCEL)
router.patch('/:id/status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'LEAD_PHARMACIST', 'DISPENSING_PHARMACIST'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDING_VERIFICATION', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    await db.query(
      `UPDATE prescriptions 
       SET status = ?, verified_by_user_id = ? 
       WHERE prescription_id = ?`,
      [status, req.user.userId, id]
    );

    res.json({ success: true, message: `Prescription status updated to ${status}` });
  } catch (error) {
    console.error('Update Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

module.exports = router;