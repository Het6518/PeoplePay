const prisma = require('../config/prisma');
const { CreateAttendanceSchema, CorrectAttendanceSchema, CheckInSchema, CheckOutSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const geofenceService = require('../services/geofenceService');
const attendanceLocationService = require('../services/attendanceLocationService');

// Calculate worked hours from checkIn/checkOut and break
function calculateWorkedHours(checkIn, checkOut, breakMinutes = 0) {
  if (!checkIn || !checkOut) return null;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  if (diffMs <= 0) return 0;

  const diffHours = diffMs / (1000 * 60 * 60);
  const breakHours = diffHours > breakMinutes / 60 ? breakMinutes / 60 : 0;
  return Math.round((diffHours - breakHours) * 100) / 100;
}

// Determine attendance status
function determineStatus(workedHours, checkIn, scheduleDay) {
  if (!checkIn) return 'ABSENT';
  if (workedHours === null || workedHours === undefined) return 'MISSING_CHECKOUT';

  if (scheduleDay && scheduleDay.startTime) {
    const [schedH, schedM] = scheduleDay.startTime.split(':').map(Number);
    const checkInTime = new Date(checkIn);
    const scheduledStart = new Date(checkIn);
    scheduledStart.setHours(schedH, schedM, 0, 0);

    const lateMinutes = (checkInTime - scheduledStart) / (1000 * 60);
    if (lateMinutes > 10) return 'LATE';
  }

  if (scheduleDay && scheduleDay.endTime) {
    const [endH, endM] = scheduleDay.endTime.split(':').map(Number);
    const expectedHours =
      (endH * 60 +
        endM -
        scheduleDay.startTime.split(':').reduce((a, v, i) => a + (i === 0 ? Number(v) * 60 : Number(v)), 0) -
        scheduleDay.breakMinutes) /
      60;
    if (workedHours > expectedHours + 1) return 'OVERTIME';
  }

  return 'PRESENT';
}

// GET /api/attendance
const getAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employeeId, departmentId, status, startDate, endDate, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};

    // Employee can only see own records
    if (req.user.role === 'EMPLOYEE') {
      where.employeeId = req.user.employeeId;
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (departmentId) {
        where.employee = { departmentId };
      }
    }

    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: 'desc' },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true,
              department: { select: { id: true, name: true } },
            },
          },
          attendanceLocation: {
            select: { id: true, name: true, latitude: true, longitude: true, radiusMeters: true },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/:id
const getAttendanceRecord = async (req, res, next) => {
  try {
    const record = await prisma.attendance.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        attendanceLocation: true,
      },
    });
    if (!record) return sendError(res, 'Attendance record not found.', 404);
    return sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance (Manual / HR Creation)
const createAttendance = async (req, res, next) => {
  try {
    const data = CreateAttendanceSchema.parse(req.body);
    const dateStr = new Date(data.date).toISOString().split('T')[0];
    const date = new Date(dateStr + 'T00:00:00.000Z');

    // Check if record already exists for that day
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date } },
    });
    if (existing) {
      return sendError(res, 'Attendance record already exists for this employee on this date.', 409);
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : null;
    const checkOut = data.checkOut ? new Date(data.checkOut) : null;

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: { workingSchedule: { include: { days: true } } },
    });
    const dayOfWeek = date.getDay();
    const scheduleDay = employee?.workingSchedule?.days.find((d) => d.dayOfWeek === dayOfWeek);
    const workedHours = calculateWorkedHours(checkIn, checkOut, scheduleDay?.breakMinutes || 0);
    const status = checkIn
      ? (checkOut ? determineStatus(workedHours, checkIn, scheduleDay) : 'MISSING_CHECKOUT')
      : 'ABSENT';

    const location = await attendanceLocationService.getEmployeeAttendanceLocation(data.employeeId);

    const record = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date,
        checkIn,
        checkOut,
        workedHours,
        status,
        notes: data.notes,
        attendanceLocationId: location?.id || null,
      },
    });

    return sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/checkin (GPS Geofenced)
const checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return sendError(res, 'No employee profile linked to your account.', 400);

    const { latitude, longitude, accuracy } = CheckInSchema.parse(req.body);

    // Get employee's designated/default office location
    const location = await attendanceLocationService.getEmployeeAttendanceLocation(employeeId);
    if (!location) {
      return sendError(
        res,
        'No active office attendance location configured. Please contact HR or Admin.',
        400
      );
    }

    // Backend independent Haversine geofence evaluation
    const geofenceResult = geofenceService.evaluateGeofence(latitude, longitude, accuracy, location);

    if (!geofenceResult.insideGeofence) {
      return res.status(400).json({
        success: false,
        message: geofenceResult.message,
        code: geofenceResult.code,
        geofenceDetails: geofenceResult,
      });
    }

    const nowStr = new Date().toISOString();
    const today = new Date(nowStr.split('T')[0] + 'T00:00:00.000Z');

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing && existing.checkIn) {
      return sendError(res, 'You have already checked in today.', 409);
    }

    const now = new Date();
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { workingSchedule: { include: { days: true } } },
    });
    const dayOfWeek = now.getDay();
    const scheduleDay = employee?.workingSchedule?.days.find((d) => d.dayOfWeek === dayOfWeek);

    let initialStatus = 'PRESENT';
    if (scheduleDay && scheduleDay.startTime) {
      const [schedH, schedM] = scheduleDay.startTime.split(':').map(Number);
      const scheduledStart = new Date(now);
      scheduledStart.setHours(schedH, schedM, 0, 0);
      const lateMinutes = (now - scheduledStart) / (1000 * 60);
      if (lateMinutes > 10) initialStatus = 'LATE';
    }

    const attendanceData = {
      checkIn: now,
      status: initialStatus,
      checkInLatitude: Number(latitude),
      checkInLongitude: Number(longitude),
      checkInAccuracy: Number(accuracy) || 0,
      checkInDistanceMeters: geofenceResult.distanceMeters,
      checkInAllowedRadiusMeters: geofenceResult.allowedRadiusMeters,
      attendanceLocationId: location.id,
    };

    let record;
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: attendanceData,
        include: { attendanceLocation: true },
      });
    } else {
      record = await prisma.attendance.create({
        data: {
          employeeId,
          date: today,
          ...attendanceData,
        },
        include: { attendanceLocation: true },
      });
    }

    return sendSuccess(res, { record, geofenceDetails: geofenceResult }, 200);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/checkout (GPS Geofenced)
const checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return sendError(res, 'No employee profile linked to your account.', 400);

    const { latitude, longitude, accuracy } = CheckOutSchema.parse(req.body);

    const nowStr = new Date().toISOString();
    const today = new Date(nowStr.split('T')[0] + 'T00:00:00.000Z');

    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!record) return sendError(res, 'No check-in record found for today. Please check in first.', 400);
    if (record.checkOut) return sendError(res, 'You have already checked out today.', 409);
    if (!record.checkIn) return sendError(res, 'Please check in before checking out.', 400);

    // Get employee's office location
    const location = await attendanceLocationService.getEmployeeAttendanceLocation(employeeId);

    // Backend independent Haversine geofence evaluation for checkout
    const geofenceResult = geofenceService.evaluateGeofence(latitude, longitude, accuracy, location);

    if (!geofenceResult.insideGeofence) {
      return res.status(400).json({
        success: false,
        message: geofenceResult.message,
        code: geofenceResult.code,
        geofenceDetails: geofenceResult,
      });
    }

    const now = new Date();
    // Get employee working schedule for status determination
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { workingSchedule: { include: { days: true } } },
    });

    const dayOfWeek = now.getDay();
    const scheduleDay = employee?.workingSchedule?.days.find((d) => d.dayOfWeek === dayOfWeek);
    const workedHours = calculateWorkedHours(record.checkIn, now, scheduleDay?.breakMinutes || 0);
    const status = determineStatus(workedHours, record.checkIn, scheduleDay);

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: {
        checkOut: now,
        workedHours,
        status,
        checkOutLatitude: Number(latitude),
        checkOutLongitude: Number(longitude),
        checkOutAccuracy: Number(accuracy) || 0,
        checkOutDistanceMeters: geofenceResult.distanceMeters,
        checkOutAllowedRadiusMeters: geofenceResult.allowedRadiusMeters,
      },
      include: { attendanceLocation: true },
    });

    return sendSuccess(res, { record: updated, geofenceDetails: geofenceResult });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/attendance/:id/correct
const correctAttendance = async (req, res, next) => {
  try {
    const data = CorrectAttendanceSchema.parse(req.body);
    const existing = await prisma.attendance.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Attendance record not found.', 404);

    const checkIn = data.checkIn ? new Date(data.checkIn) : existing.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut) : existing.checkOut;
    const workedHours = calculateWorkedHours(checkIn, checkOut);

    // Get corrector info
    const corrector = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const updated = await prisma.attendance.update({
      where: { id: req.params.id },
      data: {
        checkIn,
        checkOut,
        workedHours,
        status: 'MANUAL_CORRECTION',
        isManualCorrection: true,
        correctedById: corrector?.id,
        correctedByName: corrector ? `${corrector.firstName} ${corrector.lastName}` : req.user.userId,
        correctionReason: data.correctionReason,
        correctedAt: new Date(),
        notes: data.notes,
      },
      include: { attendanceLocation: true },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

// GET /api/attendance/today
const getTodayAttendance = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return sendSuccess(res, { record: null, location: null });

    const nowStr = new Date().toISOString();
    const today = new Date(nowStr.split('T')[0] + 'T00:00:00.000Z');

    const [record, location] = await Promise.all([
      prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId, date: today } },
        include: { attendanceLocation: true },
      }),
      attendanceLocationService.getEmployeeAttendanceLocation(employeeId),
    ]);

    return sendSuccess(res, {
      record: record || null,
      location: location || null,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAttendance,
  getAttendanceRecord,
  createAttendance,
  checkIn,
  checkOut,
  correctAttendance,
  getTodayAttendance,
  calculateWorkedHours,
};
