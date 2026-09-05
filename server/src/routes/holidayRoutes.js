const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/holidayController');

router.use(authenticate);

router.get('/suggestions', authorize(...HR_ROLES), ctrl.getPendingSuggestions);
router.post('/sync', authorize(...HR_ROLES), ctrl.syncHolidays);
router.post('/suggestions/:id/process', authorize(...HR_ROLES), ctrl.processSuggestion);
router.post('/manual', authorize(...HR_ROLES), ctrl.createManualHoliday);
router.get('/company', authorize(...HR_ROLES), ctrl.getCompanyHolidays);

module.exports = router;
