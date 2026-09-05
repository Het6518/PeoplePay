const prisma = require('../config/prisma');
const { CreateAttendanceSchema, CorrectAttendanceSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// Calculate worked hours from checkIn/checkOut and break
function calculateWorkedHours(checkIn, checkOut, breakMinutes = 60) {
  if (!checkIn || !checkOut) return null;
  const diffMs = new Date(checkOut) - new Date(checkIn);
  const diffHours = diffMs / (1000 * 60 * 60);
  const workedHours = diffHours - breakMinutes / 60;
  return Math.max(0, Math.round(workedHours * 100) / 100);
}

// Determine attendance status
function determineStatus(workedHours, checkIn, scheduleDay) {
  if (!checkIn) return 'ABSENT';
  if (!workedHours) return 'MISSING_CHECKOUT';

  if (scheduleDay && scheduleDay.startTime) {
    const [schedH, schedM] = scheduleDay.startTime.split(':').map(Number);
    const checkInTime = new Date(checkIn);
    const scheduledStart = new Date(checkIn);
    scheduledStart.setHours(schedH, schedM, 0, 0);

    const lateMinutes = (checkInTime - scheduledStart) / (1000 * 60);
    if (lateMinutes > 10) return 'LATE';
  }

  if (scheduleDay) {
    const [endH, endM] = scheduleDay.endTime.split(':').map(Number);
    const expectedHours = ((endH * 60 + endM) - 
      scheduleDay.startTime.split(':').reduce((a, v, i) => a + (i === 0 ? Number(v) * 60 : Number(v)), 0) - 
      scheduleDay.breakMinutes) / 60;
    if (workedHours > expectedHours + 1) return 'OVERTIME';
  }

  return 'PRESENT';
}

// GET /api/attendance
const getAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, employeeId, departmentId, status, startDate, endDate, search } = req.query;
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
              id: true, firstName: true, lastName: true, employeeCode: true,
              department: { select: { id: true, name: true } },
            },
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
      },
    });
    if (!record) return sendError(res, 'Attendance record not found.', 404);
    return sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance
const createAttendance = async (req, res, next) => {
  try {
    const data = CreateAttendanceSchema.parse(req.body);
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    // Check if record already exists for that day
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: data.employeeId, date } },
    });
    if (existing) {
      return sendError(res, 'Attendance record already exists for this employee on this date.', 409);
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : null;
    const checkOut = data.checkOut ? new Date(data.checkOut) : null;
    const workedHours = calculateWorkedHours(checkIn, checkOut);

    const record = await prisma.attendance.create({
      data: {
        employeeId: data.employeeId,
        date,
        checkIn,
        checkOut,
        workedHours,
        status: checkIn ? (checkOut ? 'PRESENT' : 'MISSING_CHECKOUT') : 'ABSENT',
        notes: data.notes,
      },
    });

    return sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/checkin
const checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return sendError(res, 'No employee profile linked to your account.', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (existing && existing.checkIn) {
      return sendError(res, 'You have already checked in today.', 409);
    }

    const now = new Date();

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkIn: now, status: 'PRESENT' },
      });
      return sendSuccess(res, updated);
    }

    const record = await prisma.attendance.create({
      data: {
        employeeId,
        date: today,
        checkIn: now,
        status: 'PRESENT',
      },
    });

    return sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/attendance/checkout
const checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user.employeeId;
    if (!employeeId) return sendError(res, 'No employee profile linked to your account.', 400);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    if (!record) return sendError(res, 'No check-in record found for today. Please check in first.', 400);
    if (record.checkOut) return sendError(res, 'You have already checked out today.', 409);
    if (!record.checkIn) return sendError(res, 'Please check in before checking out.', 400);

    const now = new Date();
    const workedHours = calculateWorkedHours(record.checkIn, now);

    // Get employee working schedule for status determination
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { workingSchedule: { include: { days: true } } },
    });

    const dayOfWeek = now.getDay();
    const scheduleDay = employee?.workingSchedule?.days.find((d) => d.dayOfWeek === dayOfWeek);
    const status = determineStatus(workedHours, record.checkIn, scheduleDay);

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: now, workedHours, status },
    });

    return sendSuccess(res, updated);
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
    if (!employeeId) return sendSuccess(res, null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });

    return sendSuccess(res, record || null);
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
