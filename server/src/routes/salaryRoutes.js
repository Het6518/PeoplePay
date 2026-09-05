const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/salaryController');

router.use(authenticate);

const invalidateSalaryCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

// Salary Structures
router.get('/structures', authorize(...HR_ROLES), cacheMiddleware(3600), ctrl.getSalaryStructures);
router.post('/structures', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.createSalaryStructure);
router.get('/structures/:id', authorize(...HR_ROLES), cacheMiddleware(3600), ctrl.getSalaryStructure);
router.put('/structures/:id', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.updateSalaryStructure);
router.delete('/structures/:id', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.deleteSalaryStructure);

// Salary Rules
router.get('/rules', authorize(...HR_ROLES), cacheMiddleware(3600), ctrl.getSalaryRules);
router.post('/rules', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.createSalaryRule);
router.get('/rules/:id', authorize(...HR_ROLES), cacheMiddleware(3600), ctrl.getSalaryRule);
router.put('/rules/:id', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.updateSalaryRule);
router.delete('/rules/:id', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.deleteSalaryRule);
router.post('/rules/reorder', authorize(...PAYROLL_MANAGER_ROLES), invalidateSalaryCache, ctrl.reorderRules);

module.exports = router;
