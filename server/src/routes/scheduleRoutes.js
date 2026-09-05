const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/scheduleController');

router.use(authenticate);

// Helper middleware to invalidate schedule and dashboard caches on write operations
const invalidateScheduleCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

router.get('/', cacheMiddleware(3600), ctrl.getSchedules);
router.post('/', authorize(...HR_ROLES), invalidateScheduleCache, ctrl.createSchedule);
router.get('/:id', cacheMiddleware(3600), ctrl.getSchedule);
router.put('/:id', authorize(...HR_ROLES), invalidateScheduleCache, ctrl.updateSchedule);
router.delete('/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), invalidateScheduleCache, ctrl.deleteSchedule);

module.exports = router;
