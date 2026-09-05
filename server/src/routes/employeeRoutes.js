const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/employeeController');

router.use(authenticate);

const invalidateEmployeeCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

router.get('/', ctrl.getEmployees);
router.post('/', authorize(...HR_ROLES), invalidateEmployeeCache, ctrl.createEmployee);
router.get('/:id', ctrl.getEmployee);
router.put('/:id', authorize(...HR_ROLES), invalidateEmployeeCache, ctrl.updateEmployee);
router.delete('/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), invalidateEmployeeCache, ctrl.deleteEmployee);

// Sub-resources
router.get('/:id/contracts', ctrl.getEmployeeContracts);
router.get('/:id/attendance', ctrl.getEmployeeAttendance);
router.get('/:id/payslips', ctrl.getEmployeePayslips);

module.exports = router;
