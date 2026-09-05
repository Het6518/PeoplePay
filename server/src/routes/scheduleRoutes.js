const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/scheduleController');

router.use(authenticate);

router.get('/', ctrl.getSchedules);
router.post('/', authorize(...HR_ROLES), ctrl.createSchedule);
router.get('/:id', ctrl.getSchedule);
router.put('/:id', authorize(...HR_ROLES), ctrl.updateSchedule);
router.delete('/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), ctrl.deleteSchedule);

module.exports = router;
