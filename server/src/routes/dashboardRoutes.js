const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/summary', ctrl.getSummary);
router.get('/payroll-trend', ctrl.getPayrollTrend);
router.get('/salary-by-department', ctrl.getSalaryByDepartment);
router.get('/attendance', ctrl.getAttendanceSummary);
router.get('/time-off', ctrl.getTimeOffSummary);
router.get('/alerts', ctrl.getAlerts);

module.exports = router;
