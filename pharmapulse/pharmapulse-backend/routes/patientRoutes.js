const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const verifyToken = typeof auth === 'function' ? auth : (auth.verifyToken || auth.authenticateToken);

// 1. GET /api/patients - Search patients
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT patient_id, patient_code, full_name, phone_number, email, 
             date_of_birth, gender, known_allergies, chronic_conditions, loyalty_points, created_at 
      FROM patients WHERE 1=1
    `;
    let params = [];

    if (search && search.trim() !== '') {
      query += ` AND (full_name LIKE ? OR phone_number LIKE ? OR patient_code LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params = [searchTerm, searchTerm, searchTerm];
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;
    const [patients] = await db.execute(query, params);

    res.json({ success: true, patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patients' });
  }
});

// 2. GET /api/patients/refills - Prescription refills queue (Matches RefillsManagement.jsx)
router.get('/refills', verifyToken, async (req, res) => {
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
        pat.patient_id,
        pat.full_name AS patient_name,
        d.drug_id,
        d.brand_name AS drug_name,
        COALESCE(b.selling_price, 15.00) AS selling_price
      FROM prescriptions p
      JOIN patients pat ON p.patient_id = pat.patient_id
      JOIN drugs_master d ON p.drug_id = d.drug_id
      LEFT JOIN inventory_batches b ON d.drug_id = b.drug_id
      WHERE p.refills_remaining > 0 AND p.status = 'ACTIVE'
    `;
    let params = [];

    if (search && search.trim() !== '') {
      query += ` AND (p.prescription_number LIKE ? OR pat.full_name LIKE ?)`;
      const searchTerm = `%${search.trim()}%`;
      params = [searchTerm, searchTerm];
    }

    query += ` GROUP BY p.prescription_id ORDER BY p.issue_date DESC LIMIT 50`;
    const [prescriptions] = await db.execute(query, params);

    res.json({ success: true, prescriptions });
  } catch (error) {
    console.error('Error fetching refills:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch prescription refills' });
  }
});

// 3. GET /api/patients/:id/history - Get patient dispense log
router.get('/:id/history', verifyToken, async (req, res) => {
  try {
    const patientId = req.params.id;
    const query = `
      SELECT 
        si.quantity_sold,
        si.unit_price,
        si.total_price,
        st.created_at,
        d.brand_name,
        d.generic_name,
        st.prescription_id,
        st.transaction_number
      FROM sales_items si
      JOIN sales_transactions st ON si.transaction_id = st.transaction_id
      JOIN drugs_master d ON si.drug_id = d.drug_id
      WHERE st.patient_id = ?
      ORDER BY st.created_at DESC
      LIMIT 50
    `;

    const [history] = await db.execute(query, [patientId]);
    res.json({ success: true, history });
  } catch (error) {
    console.error('Error fetching patient history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch patient history' });
  }
});

// 4. POST /api/patients - Register a new patient
router.post('/', verifyToken, async (req, res) => {
  try {
    const { full_name, phone_number, email, date_of_birth, gender, known_allergies, chronic_conditions } = req.body;

    if (!full_name || !phone_number) {
      return res.status(400).json({ success: false, message: 'Full name and phone number are required.' });
    }

    const patient_code = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;

    const [result] = await db.execute(
      `INSERT INTO patients 
        (patient_code, full_name, phone_number, email, date_of_birth, gender, known_allergies, chronic_conditions, loyalty_points) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        patient_code,
        full_name,
        phone_number,
        email || null,
        date_of_birth || null,
        gender || 'Male',
        known_allergies || null,
        chronic_conditions || null
      ]
    );

    const newPatient = {
      patient_id: result.insertId,
      patient_code,
      full_name,
      phone_number,
      email: email || null,
      date_of_birth: date_of_birth || null,
      gender: gender || 'Male',
      known_allergies: known_allergies || null,
      chronic_conditions: chronic_conditions || null,
      loyalty_points: 0
    };

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      patient: newPatient
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create patient.' });
  }
});

module.exports = router;