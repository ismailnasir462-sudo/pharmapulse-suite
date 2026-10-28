const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Your MySQL/MariaDB connection pool

// ==========================================
// 1. PATIENT MANAGEMENT ENDPOINTS
// ==========================================

// GET /api/patients - Search and retrieve patients
router.get('/patients', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `SELECT * FROM patients WHERE 1=1`;
    let params = [];

    if (search && search.trim() !== '') {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR patient_code LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params = [searchTerm, searchTerm, searchTerm, searchTerm];
    }

    query += ` ORDER BY patient_id DESC LIMIT 50`;
    const [patients] = await db.execute(query, params);

    res.json({ success: true, patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
});

// GET /api/patients/:id/history - Get dispense history for a patient
router.get('/patients/:id/history', async (req, res) => {
  try {
    const patientId = req.params.id;
    const query = `
      SELECT 
        ti.quantity_sold,
        ti.unit_price,
        ti.created_at,
        d.brand_name,
        d.generic_name,
        pt.prescription_id,
        pt.transaction_number
      FROM transaction_items ti
      JOIN pos_transactions pt ON ti.transaction_id = pt.transaction_id
      JOIN drugs_master d ON ti.drug_id = d.drug_id
      WHERE pt.patient_id = ?
      ORDER BY ti.created_at DESC
      LIMIT 50
    `;

    const [history] = await db.execute(query, [patientId]);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient history' });
  }
});

// POST /api/patients - Register a new patient
router.post('/patients', async (req, res) => {
  try {
    const { first_name, last_name, phone, date_of_birth, gender, allergies, medical_notes } = req.body;
    
    // Auto-generate a unique PAT code
    const patient_code = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

    const query = `
      INSERT INTO patients (patient_code, first_name, last_name, phone, date_of_birth, gender, allergies, medical_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      patient_code,
      first_name,
      last_name,
      phone || null,
      date_of_birth || null,
      gender || 'Male',
      allergies || null,
      medical_notes || null
    ]);

    res.json({
      success: true,
      message: 'Patient registered successfully',
      patient_id: result.insertId,
      patient_code
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ success: false, message: 'Failed to create patient' });
  }
});


// ==========================================
// 2. PRESCRIPTION REFILLS ENDPOINTS
// ==========================================

// GET /api/prescriptions/refills - Get active prescription refills queue
router.get('/prescriptions/refills', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        p.prescription_id,
        p.prescription_number,
        p.issue_date,
        p.refills_authorized,
        p.refills_remaining,
        p.dosage_instructions,
        CONCAT(pat.first_name, ' ', pat.last_name) AS patient_name,
        d.drug_id,
        d.brand_name AS drug_name,
        d.selling_price
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.patient_id
      JOIN drugs_master d ON p.drug_id = d.drug_id
      WHERE p.refills_remaining > 0 AND p.status = 'ACTIVE'
    `;
    let params = [];

    if (search && search.trim() !== '') {
      query += ` AND (p.prescription_number LIKE ? OR pat.first_name LIKE ? OR pat.last_name LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ` ORDER BY p.issue_date DESC LIMIT 50`;
    const [prescriptions] = await db.execute(query, params);

    res.json({ success: true, prescriptions });
  } catch (error) {
    console.error('Error fetching refills:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch prescription refills' });
  }
});

module.exports = router;