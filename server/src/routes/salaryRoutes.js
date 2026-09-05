const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES, PAYROLL_ROLES, PAYROLL_MANAGER_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/salaryController');

router.use(authenticate);

// Salary Structures
router.get('/structures', authorize(...HR_ROLES), ctrl.getSalaryStructures);
router.post('/structures', authorize(...PAYROLL_MANAGER_ROLES), ctrl.createSalaryStructure);
router.get('/structures/:id', authorize(...HR_ROLES), ctrl.getSalaryStructure);
router.put('/structures/:id', authorize(...PAYROLL_MANAGER_ROLES), ctrl.updateSalaryStructure);
router.delete('/structures/:id', authorize(...PAYROLL_MANAGER_ROLES), ctrl.deleteSalaryStructure);

// Salary Rules
router.get('/rules', authorize(...HR_ROLES), ctrl.getSalaryRules);
router.post('/rules', authorize(...PAYROLL_MANAGER_ROLES), ctrl.createSalaryRule);
router.get('/rules/:id', authorize(...HR_ROLES), ctrl.getSalaryRule);
router.put('/rules/:id', authorize(...PAYROLL_MANAGER_ROLES), ctrl.updateSalaryRule);
router.delete('/rules/:id', authorize(...PAYROLL_MANAGER_ROLES), ctrl.deleteSalaryRule);
router.post('/rules/reorder', authorize(...PAYROLL_MANAGER_ROLES), ctrl.reorderRules);

module.exports = router;
