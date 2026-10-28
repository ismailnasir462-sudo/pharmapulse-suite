// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

// Allowed Origins List (Includes React on :3000 and Vite on :5173)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Asset Serving (Drug packaging images & scan uploads)
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// Import Routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const drugRoutes = require('./routes/drugRoutes');
const posRoutes = require('./routes/posRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const userRoutes = require('./routes/userRoutes');


// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/users', userRoutes);

// Server Root Status Check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PharmaPulse ERP Express Backend Operational',
    timestamp: new Date().toISOString()
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PharmaPulse API running on http://localhost:${PORT}`);
});