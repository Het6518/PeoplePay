const jwt = require('jsonwebtoken');
const { sendError } = require('../utils/response');

// Verify JWT and attach user to req
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Please login.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, role, employeeId }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Session expired. Please login again.', 401);
    }
    return sendError(res, 'Invalid authentication token.', 401);
  }
};

// Role-based authorization factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 'You do not have permission to perform this action.', 403);
    }
    next();
  };
};

// HR+ roles
const HR_ROLES = ['HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
// Payroll roles
const PAYROLL_ROLES = ['HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN'];
// Payroll manager roles
const PAYROLL_MANAGER_ROLES = ['HR_PAYROLL_MANAGER', 'ADMIN'];
// Admin only
const ADMIN_ROLES = ['ADMIN'];

module.exports = {
  authenticate,
  authorize,
  HR_ROLES,
  PAYROLL_ROLES,
  PAYROLL_MANAGER_ROLES,
  ADMIN_ROLES,
};
