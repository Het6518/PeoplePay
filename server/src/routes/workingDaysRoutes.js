const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/workingDaysController');

router.use(authenticate);

router.get('/policy', authorize(...HR_ROLES), ctrl.getPolicy);
router.put('/policy', authorize(...HR_ROLES), ctrl.updatePolicy);
router.get('/calculate-period', authorize(...HR_ROLES), ctrl.calculatePeriodDays);

module.exports = router;
