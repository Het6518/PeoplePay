const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/employeeController');

router.use(authenticate);

router.get('/', ctrl.getEmployees);
router.post('/', authorize(...HR_ROLES), ctrl.createEmployee);
router.get('/:id', ctrl.getEmployee);
router.put('/:id', authorize(...HR_ROLES), ctrl.updateEmployee);
router.delete('/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), ctrl.deleteEmployee);

// Sub-resources
router.get('/:id/contracts', ctrl.getEmployeeContracts);
router.get('/:id/attendance', ctrl.getEmployeeAttendance);
router.get('/:id/payslips', ctrl.getEmployeePayslips);

module.exports = router;
