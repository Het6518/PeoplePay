const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceController');

router.use(authenticate);

router.get('/', ctrl.getAttendance);
router.post('/', authorize(...HR_ROLES), ctrl.createAttendance);
router.get('/today', ctrl.getTodayAttendance);
router.post('/checkin', ctrl.checkIn);
router.post('/checkout', ctrl.checkOut);
router.get('/:id', ctrl.getAttendanceRecord);
router.patch('/:id/correct', authorize(...HR_ROLES), ctrl.correctAttendance);

module.exports = router;
