CREATE DATABASE IF NOT EXISTS pharmapulse;
USE pharmapulse;

-- Disable FK checks during schema setup
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS sales_items;
DROP TABLE IF EXISTS sales_transactions;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS inventory_batches;
DROP TABLE IF EXISTS drugs_master;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Roles Table
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (role_id, role_name) VALUES 
(1, 'SUPER_ADMIN'),
(2, 'LEAD_PHARMACIST'),
(3, 'CASHIER'),
(4, 'INVENTORY_MANAGER');

-- 2. Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL DEFAULT 3,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone_number VARCHAR(20) DEFAULT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
);

-- Default admin user (Password: password123)
INSERT INTO users (role_id, full_name, email, phone_number, password_hash, is_active) VALUES 
(1, 'Ismaila Nasiru', 'admin@pharmapulse.com', '+233200000000', '$2a$10$e88yUoQkC.6lA0Apt2N1/O6x1pT4P.p3L.zWJ2nB0h2/G2o4m3.02', 1);

-- 3. Patients Table
CREATE TABLE patients (
    patient_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    date_of_birth DATE DEFAULT NULL,
    gender ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
    known_allergies TEXT DEFAULT NULL,
    chronic_conditions TEXT DEFAULT NULL,
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Sample Patient
INSERT INTO patients (patient_code, full_name, phone_number, email, date_of_birth, gender, known_allergies, chronic_conditions, loyalty_points) VALUES
('PAT-1001', 'Kofi Mensah', '+233244123456', 'kofi@gmail.com', '1990-05-15', 'Male', 'Penicillin', 'Hypertension', 25);

-- 4. Drugs Master Catalog
CREATE TABLE drugs_master (
    drug_id INT AUTO_INCREMENT PRIMARY KEY,
    brand_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100) NOT NULL,
    active_ingredient VARCHAR(100) NOT NULL,
    strength VARCHAR(50) NOT NULL,
    dosage_form VARCHAR(50) NOT NULL DEFAULT 'Tablet',
    barcode VARCHAR(100) DEFAULT NULL,
    category VARCHAR(50) DEFAULT 'General',
    is_controlled_substance TINYINT(1) DEFAULT 0,
    reorder_level INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Sample Drugs
INSERT INTO drugs_master (brand_name, generic_name, active_ingredient, strength, dosage_form, barcode, category) VALUES
('Paracetamol Extra', 'Paracetamol / Caffeine', 'Acetaminophen', '500mg/65mg', 'Tablet', '8901234567890', 'OTC Medications'),
('Amoxil', 'Amoxicillin', 'Amoxicillin Trihydrate', '500mg', 'Capsule', '8901234567891', 'Prescriptions'),
('Lisinopril', 'Lisinopril', 'Lisinopril', '10mg', 'Tablet', '8901234567892', 'Prescriptions');

-- 5. Inventory Batches Table (FEFO Managed)
CREATE TABLE inventory_batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id INT NOT NULL,
    supplier_id INT DEFAULT NULL,
    batch_number VARCHAR(50) NOT NULL,
    quantity_in_stock INT NOT NULL DEFAULT 0,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    discount_percentage DECIMAL(5,2) DEFAULT 0.00,
    manufacture_date DATE DEFAULT NULL,
    expiry_date DATE NOT NULL,
    storage_location VARCHAR(50) DEFAULT 'General Shelf',
    status ENUM('ACTIVE', 'EXPIRED', 'DISCONTINUED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drug_id) REFERENCES drugs_master(drug_id) ON DELETE CASCADE
);

-- Seed Batches
INSERT INTO inventory_batches (drug_id, batch_number, quantity_in_stock, cost_price, selling_price, expiry_date) VALUES
(1, 'BATCH-001', 100, 5.00, 15.00, '2027-12-31'),
(2, 'BATCH-002', 50, 12.00, 35.00, '2027-06-30'),
(3, 'BATCH-003', 80, 8.00, 25.00, '2028-01-01');

-- 6. Prescriptions Table
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    prescription_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    drug_id INT NOT NULL,
    issue_date DATE NOT NULL,
    refills_authorized INT NOT NULL DEFAULT 1,
    refills_remaining INT NOT NULL DEFAULT 1,
    dosage_instructions VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    FOREIGN KEY (drug_id) REFERENCES drugs_master(drug_id) ON DELETE CASCADE
);

-- Seed Sample Prescription
INSERT INTO prescriptions (prescription_number, patient_id, drug_id, issue_date, refills_authorized, refills_remaining, dosage_instructions) VALUES
('RX-8839', 1, 3, '2026-10-01', 3, 2, 'Take 1 tablet daily in the morning');

-- 7. Sales Transactions Table
CREATE TABLE sales_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_number VARCHAR(100) NOT NULL UNIQUE,
    patient_id INT DEFAULT NULL,
    user_id INT NOT NULL,
    prescription_id INT DEFAULT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('CASH', 'CARD', 'MOMO') NOT NULL DEFAULT 'CASH',
    payment_status ENUM('PAID', 'PENDING', 'CANCELLED') DEFAULT 'PAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE SET NULL
);

-- 8. Sales Items Table
CREATE TABLE sales_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT NOT NULL,
    batch_id INT NOT NULL,
    drug_id INT NOT NULL,
    quantity_sold INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_applied DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES inventory_batches(batch_id) ON DELETE CASCADE,
    FOREIGN KEY (drug_id) REFERENCES drugs_master(drug_id) ON DELETE CASCADE
);