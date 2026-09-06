require('express-async-errors');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const contractRoutes = require('./routes/contractRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timeOffRoutes = require('./routes/timeOffRoutes');
const salaryRoutes = require('./routes/salaryRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const attendanceLocationRoutes = require('./routes/attendanceLocationRoutes');
const holidayRoutes = require('./routes/holidayRoutes');
const workingDaysRoutes = require('./routes/workingDaysRoutes');
const overtimeRoutes = require('./routes/overtimeRoutes');
const taxRoutes = require('./routes/taxRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'PeoplePay360 API' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', adminRoutes);          // /api/departments, /api/users
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/attendance-locations', attendanceLocationRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/tax', taxRoutes);
app.use('/api/payroll/tax', taxRoutes);
app.use('/api', payrollRoutes);        // /api/payruns, /api/payslips
app.use('/api/holidays', holidayRoutes);
app.use('/api/working-days', workingDaysRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// Centralized error handler (must be last)
app.use(errorHandler);

module.exports = app;
