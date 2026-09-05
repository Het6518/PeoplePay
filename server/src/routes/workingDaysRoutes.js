const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/workingDaysController');

router.use(authenticate);

const invalidateWorkingDaysCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

router.get('/policy', authorize(...HR_ROLES), cacheMiddleware(3600), ctrl.getPolicy);
router.put('/policy', authorize(...HR_ROLES), invalidateWorkingDaysCache, ctrl.updatePolicy);
router.get('/calculate-period', authorize(...HR_ROLES), cacheMiddleware(1800), ctrl.calculatePeriodDays);

module.exports = router;
