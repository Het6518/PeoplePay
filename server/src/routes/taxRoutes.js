const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');
const { authenticate, authorize } = require('../middleware/auth');

// All authenticated users (employees & HR) can access the tax calculator
router.use(authenticate);

router.post('/calculate', taxController.calculateTax);
router.post('/compare', taxController.compareRegimes);
router.get('/employee/:id', taxController.getEmployeeTaxProfile);

module.exports = router;
