const express = require('express');
const router = express.Router();
const { authenticate, authorize, HR_ROLES, ADMIN_ROLES } = require('../middleware/auth');
const { getDepartments, createDepartment, getDepartment, updateDepartment, deleteDepartment, getUsers, createUser, updateUser } = require('../controllers/adminController');

// Department routes
router.get('/departments', authenticate, getDepartments);
router.post('/departments', authenticate, authorize(...HR_ROLES), createDepartment);
router.get('/departments/:id', authenticate, getDepartment);
router.put('/departments/:id', authenticate, authorize(...HR_ROLES), updateDepartment);
router.delete('/departments/:id', authenticate, authorize(...ADMIN_ROLES), deleteDepartment);

// User management (ADMIN only)
router.get('/users', authenticate, authorize('ADMIN'), getUsers);
router.post('/users', authenticate, authorize('ADMIN'), createUser);
router.put('/users/:id', authenticate, authorize('ADMIN'), updateUser);

module.exports = router;
