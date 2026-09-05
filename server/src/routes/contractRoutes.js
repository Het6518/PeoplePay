const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/contractController');

router.use(authenticate);

router.get('/', ctrl.getContracts);
router.post('/', authorize(...HR_ROLES), ctrl.createContract);
router.get('/:id', ctrl.getContract);
router.put('/:id', authorize(...HR_ROLES), ctrl.updateContract);
router.delete('/:id', authorize('HR_PAYROLL_MANAGER', 'ADMIN'), ctrl.deleteContract);

module.exports = router;
