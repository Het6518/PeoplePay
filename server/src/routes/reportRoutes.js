const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const ctrl = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/payroll', cacheMiddleware(300), ctrl.getPayrollReport);
router.get('/attendance', cacheMiddleware(180), ctrl.getAttendanceReport);
router.get('/time-off', cacheMiddleware(180), ctrl.getTimeOffReport);

module.exports = router;
