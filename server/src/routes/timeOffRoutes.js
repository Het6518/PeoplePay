const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/timeOffController');

router.use(authenticate);

const invalidateTimeOffCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

// Time Off Types
router.get('/types', cacheMiddleware(3600), ctrl.getTimeOffTypes);
router.post('/types', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.createTimeOffType);
router.put('/types/:id', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.updateTimeOffType);
router.delete('/types/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), invalidateTimeOffCache, ctrl.deleteTimeOffType);

// Allocations
router.get('/allocations', ctrl.getAllocations);
router.post('/allocations', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.createAllocation);
router.put('/allocations/:id', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.updateAllocation);
router.post('/allocations/:id/approve', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.approveAllocation);
router.post('/allocations/:id/refuse', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.refuseAllocation);

// Requests & Balance
router.get('/balance', ctrl.getLeaveBalance);
router.get('/requests', ctrl.getTimeOffRequests);
router.post('/requests', invalidateTimeOffCache, ctrl.createTimeOffRequest);
router.get('/requests/:id', ctrl.getTimeOffRequest);
router.post('/requests/:id/approve', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.approveTimeOffRequest);
router.post('/requests/:id/reject', authorize(...HR_ROLES), invalidateTimeOffCache, ctrl.rejectTimeOffRequest);
router.post('/requests/:id/cancel', invalidateTimeOffCache, ctrl.cancelTimeOffRequest);

module.exports = router;
