const attendanceLocationService = require('../services/attendanceLocationService');
const {
  CreateAttendanceLocationSchema,
  UpdateAttendanceLocationSchema,
  AssignAttendanceLocationSchema,
} = require('../validators/schemas');
const { sendSuccess, sendError } = require('../utils/response');

// GET /api/attendance-locations
const getLocations = async (req, res, next) => {
  try {
    const locations = await attendanceLocationService.getAllLocations(req.query);
    return sendSuccess(res, locations);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance-locations/audits
const getAuditLogs = async (req, res, next) => {
  try {
    const { locationId } = req.query;
    const logs = await attendanceLocationService.getLocationAuditLogs(locationId);
    return sendSuccess(res, logs);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance-locations/:id
const getLocationById = async (req, res, next) => {
  try {
    const location = await attendanceLocationService.getLocationById(req.params.id);
    if (!location) return sendError(res, 'Attendance location not found.', 404);
    return sendSuccess(res, location);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance-locations
const createLocation = async (req, res, next) => {
  try {
    const data = CreateAttendanceLocationSchema.parse(req.body);
    const userId = req.user?.userId;
    const userName = req.user?.email || 'Admin';
    const location = await attendanceLocationService.createLocation(data, userId, userName);
    return sendSuccess(res, location, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/attendance-locations/:id
const updateLocation = async (req, res, next) => {
  try {
    const data = UpdateAttendanceLocationSchema.parse(req.body);
    const userId = req.user?.userId;
    const userName = req.user?.email || 'Admin';
    const location = await attendanceLocationService.updateLocation(req.params.id, data, userId, userName);
    return sendSuccess(res, location);
  } catch (err) {
    if (err.message === 'LOCATION_NOT_FOUND') {
      return sendError(res, 'Attendance location not found.', 404);
    }
    next(err);
  }
};

// PATCH /api/attendance-locations/:id/toggle
const toggleLocationStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const userId = req.user?.userId;
    const userName = req.user?.email || 'Admin';
    const location = await attendanceLocationService.toggleLocationStatus(
      req.params.id,
      Boolean(isActive),
      userId,
      userName
    );
    return sendSuccess(res, location);
  } catch (err) {
    if (err.message === 'LOCATION_NOT_FOUND') {
      return sendError(res, 'Attendance location not found.', 404);
    }
    next(err);
  }
};

// DELETE /api/attendance-locations/:id
const deleteLocation = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const userName = req.user?.email || 'Admin';
    const result = await attendanceLocationService.deleteLocation(req.params.id, userId, userName);
    return sendSuccess(res, result);
  } catch (err) {
    if (err.message === 'LOCATION_NOT_FOUND') {
      return sendError(res, 'Attendance location not found.', 404);
    }
    next(err);
  }
};

// POST /api/attendance-locations/assign
const assignLocation = async (req, res, next) => {
  try {
    const { employeeId, locationId } = AssignAttendanceLocationSchema.parse(req.body);
    const userId = req.user?.userId;
    const userName = req.user?.email || 'Admin';
    const employee = await attendanceLocationService.assignLocationToEmployee(
      employeeId,
      locationId,
      userId,
      userName
    );
    return sendSuccess(res, employee);
  } catch (err) {
    if (err.message === 'EMPLOYEE_NOT_FOUND') {
      return sendError(res, 'Employee not found.', 404);
    }
    if (err.message === 'LOCATION_NOT_FOUND') {
      return sendError(res, 'Attendance location not found.', 404);
    }
    next(err);
  }
};

module.exports = {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  toggleLocationStatus,
  deleteLocation,
  assignLocation,
  getAuditLogs,
};
