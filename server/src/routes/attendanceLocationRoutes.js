const express = require('express');
const router = express.Router();
const { authenticate, authorize, ADMIN_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/attendanceLocationController');

router.use(authenticate);

const invalidateLocationCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

router.get('/', authorize(...ADMIN_ROLES), cacheMiddleware(1800), ctrl.getLocations);
router.get('/audits', authorize(...ADMIN_ROLES), ctrl.getAuditLogs);
router.get('/:id', authorize(...ADMIN_ROLES), cacheMiddleware(1800), ctrl.getLocationById);
router.post('/', authorize(...ADMIN_ROLES), invalidateLocationCache, ctrl.createLocation);
router.put('/:id', authorize(...ADMIN_ROLES), invalidateLocationCache, ctrl.updateLocation);
router.patch('/:id/toggle', authorize(...ADMIN_ROLES), invalidateLocationCache, ctrl.toggleLocationStatus);
router.delete('/:id', authorize(...ADMIN_ROLES), invalidateLocationCache, ctrl.deleteLocation);
router.post('/assign', authorize(...ADMIN_ROLES), invalidateLocationCache, ctrl.assignLocation);

module.exports = router;
