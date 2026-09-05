const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/overtimeController');

router.use(authenticate);

router.get('/', ctrl.getOvertimeRecords);
router.get('/me', ctrl.getMyOvertime);
router.get('/summary', ctrl.getOvertimeSummary);
router.post('/:id/approve', authorize(...HR_ROLES), ctrl.approveOvertime);
router.post('/:id/reject', authorize(...HR_ROLES), ctrl.rejectOvertime);
router.patch('/:id/correct', authorize(...HR_ROLES), ctrl.correctOvertime);

module.exports = router;
