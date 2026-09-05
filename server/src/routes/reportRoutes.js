const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/payroll', ctrl.getPayrollReport);
router.get('/attendance', ctrl.getAttendanceReport);
router.get('/time-off', ctrl.getTimeOffReport);

module.exports = router;
