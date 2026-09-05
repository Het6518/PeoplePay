const express = require('express');
const router = express.Router();
const { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/payrollController');

router.use(authenticate);

// Payruns
router.get('/payruns', authorize(...PAYROLL_ROLES), ctrl.getPayruns);
router.post('/payruns', authorize(...PAYROLL_ROLES), ctrl.createPayrun);
router.post('/payruns/check-overlaps', authorize(...PAYROLL_ROLES), ctrl.checkOverlaps);
router.get('/payruns/:id', authorize(...PAYROLL_ROLES), ctrl.getPayrun);
router.post('/payruns/:id/compute', authorize(...PAYROLL_ROLES), ctrl.computePayrun);
router.post('/payruns/:id/validate', authorize(...PAYROLL_ROLES), ctrl.validatePayrunAction);
router.post('/payruns/:id/mark-paid', authorize(...PAYROLL_MANAGER_ROLES), ctrl.markPayrunPaid);
router.post('/payruns/:id/send-payslips', authorize(...PAYROLL_ROLES), ctrl.sendPayslips);

// Payslips
router.get('/payslips', authorize(...PAYROLL_ROLES), ctrl.getPayslips);
router.get('/payslips/:id', authorize(...PAYROLL_ROLES), ctrl.getPayslip);
router.get('/payslips/:id/pdf', authorize(...PAYROLL_ROLES), ctrl.downloadPayslipPDF);

module.exports = router;
