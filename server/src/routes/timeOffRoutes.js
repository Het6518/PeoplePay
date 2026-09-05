const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/timeOffController');

router.use(authenticate);

// Time Off Types
router.get('/types', ctrl.getTimeOffTypes);
router.post('/types', authorize(...HR_ROLES), ctrl.createTimeOffType);
router.put('/types/:id', authorize(...HR_ROLES), ctrl.updateTimeOffType);
router.delete('/types/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), ctrl.deleteTimeOffType);

// Allocations
router.get('/allocations', ctrl.getAllocations);
router.post('/allocations', authorize(...HR_ROLES), ctrl.createAllocation);
router.put('/allocations/:id', authorize(...HR_ROLES), ctrl.updateAllocation);
router.post('/allocations/:id/approve', authorize(...HR_ROLES), ctrl.approveAllocation);
router.post('/allocations/:id/refuse', authorize(...HR_ROLES), ctrl.refuseAllocation);

// Requests
router.get('/requests', ctrl.getTimeOffRequests);
router.post('/requests', ctrl.createTimeOffRequest);
router.get('/requests/:id', ctrl.getTimeOffRequest);
router.post('/requests/:id/approve', authorize(...HR_ROLES), ctrl.approveTimeOffRequest);
router.post('/requests/:id/reject', authorize(...HR_ROLES), ctrl.rejectTimeOffRequest);
router.post('/requests/:id/cancel', ctrl.cancelTimeOffRequest);

module.exports = router;
