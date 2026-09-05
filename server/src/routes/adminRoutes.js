const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES, ADMIN_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const {
  getDepartments,
  createDepartment,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getUsers,
  createUser,
  updateUser,
  getRedisInfo,
  clearRedisCache
} = require('../controllers/adminController');

const invalidateDeptCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

// Department routes
router.get('/departments', authenticate, cacheMiddleware(3600), getDepartments);
router.post('/departments', authenticate, authorize(...HR_ROLES), invalidateDeptCache, createDepartment);
router.get('/departments/:id', authenticate, cacheMiddleware(3600), getDepartment);
router.put('/departments/:id', authenticate, authorize(...HR_ROLES), invalidateDeptCache, updateDepartment);
router.delete('/departments/:id', authenticate, authorize(...ADMIN_ROLES), invalidateDeptCache, deleteDepartment);

// User management (ADMIN only)
router.get('/users', authenticate, authorize('ADMIN'), getUsers);
router.post('/users', authenticate, authorize('ADMIN'), createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), updateUser);

// Redis Cache Monitoring & Control (ADMIN only)
router.get('/redis-status', authenticate, authorize('ADMIN'), getRedisInfo);
router.post('/redis-clear', authenticate, authorize('ADMIN'), clearRedisCache);

module.exports = router;
