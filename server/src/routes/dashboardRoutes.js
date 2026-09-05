const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/summary', cacheMiddleware(300), ctrl.getSummary);
router.get('/payroll-trend', cacheMiddleware(600), ctrl.getPayrollTrend);
router.get('/salary-by-department', cacheMiddleware(600), ctrl.getSalaryByDepartment);
router.get('/attendance', cacheMiddleware(180), ctrl.getAttendanceSummary);
router.get('/time-off', cacheMiddleware(180), ctrl.getTimeOffSummary);
router.get('/alerts', cacheMiddleware(120), ctrl.getAlerts);

router.get('/admin', cacheMiddleware(300), ctrl.getAdminDashboard);
router.get('/payroll-manager', cacheMiddleware(300), ctrl.getPayrollManagerDashboard);
router.get('/payroll-user', cacheMiddleware(300), ctrl.getPayrollUserDashboard);

router.post('/flag-warning', async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
}, ctrl.flagPayslipWarning);

module.exports = router;
