const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceLocationController');

router.use(authenticate);

router.get('/', ctrl.getLocations);
router.get('/audits', authorize(...HR_ROLES), ctrl.getAuditLogs);
router.get('/:id', ctrl.getLocationById);
router.post('/', authorize(...HR_ROLES), ctrl.createLocation);
router.put('/:id', authorize(...HR_ROLES), ctrl.updateLocation);
router.patch('/:id/toggle', authorize(...HR_ROLES), ctrl.toggleLocationStatus);
router.delete('/:id', authorize(...HR_ROLES), ctrl.deleteLocation);
router.post('/assign', authorize(...HR_ROLES), ctrl.assignLocation);

module.exports = router;
