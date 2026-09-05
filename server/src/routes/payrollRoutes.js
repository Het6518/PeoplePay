const express = require('express');
const router = express.Router();
const { authenticate, authorize, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/redisCache');
const { delCachePattern } = require('../config/redis');
const ctrl = require('../controllers/payrollController');

router.use(authenticate);

const invalidatePayrollCache = async (req, res, next) => {
  await delCachePattern('cache:*');
  next();
};

// Payruns
router.get('/payruns', authorize(...PAYROLL_ROLES), cacheMiddleware(120), ctrl.getPayruns);
router.post('/payruns', authorize(...PAYROLL_ROLES), invalidatePayrollCache, ctrl.createPayrun);
router.post('/payruns/check-overlaps', authorize(...PAYROLL_ROLES), ctrl.checkOverlaps);
router.get('/payruns/:id', authorize(...PAYROLL_ROLES), cacheMiddleware(120), ctrl.getPayrun);
router.post('/payruns/:id/compute', authorize(...PAYROLL_ROLES), invalidatePayrollCache, ctrl.computePayrun);
router.post('/payruns/:id/validate', authorize(...PAYROLL_ROLES), invalidatePayrollCache, ctrl.validatePayrunAction);
router.post('/payruns/:id/mark-paid', authorize(...PAYROLL_MANAGER_ROLES), invalidatePayrollCache, ctrl.markPayrunPaid);
router.post('/payruns/:id/send-payslips', authorize(...PAYROLL_ROLES), invalidatePayrollCache, ctrl.sendPayslips);
router.get('/payruns/:id/send-payslips/status', authorize(...PAYROLL_ROLES), ctrl.getPayslipDispatchStatus);
router.get('/payruns/:id/bank-advice/summary', authorize(...PAYROLL_ROLES), ctrl.getBankAdviceSummary);
router.get('/payruns/:id/bank-advice', authorize(...PAYROLL_ROLES), ctrl.downloadBankAdviceCSV);

// Payslips (Employees can view & download their own payslips; HR/Payroll can view all)
const ALL_ROLES = ['EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
router.get('/payslips', authorize(...ALL_ROLES), ctrl.getPayslips);
router.get('/payslips/:id', authorize(...ALL_ROLES), ctrl.getPayslip);
router.get('/payslips/:id/pdf', authorize(...ALL_ROLES), ctrl.downloadPayslipPDF);

module.exports = router;
