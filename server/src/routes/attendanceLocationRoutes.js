const express = require('express');
const router = express.Router();
const { authenticate, authorize, ADMIN_ROLES } = require('../middleware/auth');
const ctrl = require('../controllers/attendanceLocationController');

router.use(authenticate);

router.get('/', authorize(...ADMIN_ROLES), ctrl.getLocations);
router.get('/audits', authorize(...ADMIN_ROLES), ctrl.getAuditLogs);
router.get('/:id', authorize(...ADMIN_ROLES), ctrl.getLocationById);
router.post('/', authorize(...ADMIN_ROLES), ctrl.createLocation);
router.put('/:id', authorize(...ADMIN_ROLES), ctrl.updateLocation);
router.patch('/:id/toggle', authorize(...ADMIN_ROLES), ctrl.toggleLocationStatus);
router.delete('/:id', authorize(...ADMIN_ROLES), ctrl.deleteLocation);
router.post('/assign', authorize(...ADMIN_ROLES), ctrl.assignLocation);

module.exports = router;
