/**
 * PeoplePay360 Overtime Controller
 *
 * Handles overtime listing, self-service queries, HR approvals,
 * manual corrections, and dashboard summary metrics.
 */

const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// GET /api/overtime
const getOvertimeRecords = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      employeeId,
      departmentId,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = {};

    // Role-based visibility
    if (req.user.role === 'EMPLOYEE') {
      let empId = req.user.employeeId;
      if (!empId && req.user.userId) {
        const emp = await prisma.employee.findUnique({
          where: { userId: req.user.userId },
          select: { id: true },
        });
        empId = emp?.id;
      }
      where.employeeId = empId;
    } else {
      if (employeeId) where.employeeId = employeeId;
      if (departmentId) {
        where.employee = { departmentId };
      }
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.employee = {
        ...where.employee,
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [records, total] = await Promise.all([
      prisma.overtime.findMany({
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
              jobPosition: true,
              department: { select: { id: true, name: true } },
            },
          },
          attendance: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              workedHours: true,
              status: true,
            },
          },
        },
      }),
      prisma.overtime.count({ where }),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/overtime/me
const getMyOvertime = async (req, res, next) => {
  try {
    let employeeId = req.user.employeeId;
    if (!employeeId && req.user.userId) {
      const emp = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      employeeId = emp?.id;
    }

    if (!employeeId) return sendError(res, 'No employee profile linked to account.', 400);

    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { employeeId };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.overtime.findMany({
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
              jobPosition: true,
              department: { select: { id: true, name: true } },
            },
          },
          attendance: {
            select: {
              id: true,
              checkIn: true,
              checkOut: true,
              workedHours: true,
              status: true,
            },
          },
        },
      }),
      prisma.overtime.count({ where }),
    ]);

    return sendPaginated(res, records, page, limit, total);
  } catch (err) {
    next(err);
  }
};

// GET /api/overtime/summary
const getOvertimeSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const where = {};

    let empId = req.user.employeeId;
    if (!empId && req.user.userId) {
      const emp = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      empId = emp?.id;
    }

    if (req.user.role === 'EMPLOYEE') {
      where.employeeId = empId;
    } else if (departmentId) {
      where.employee = { departmentId };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [allRecords, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.overtime.findMany({
        where: { ...where, status: 'APPROVED' },
        select: { overtimeHours: true, overtimeAmount: true },
      }),
      prisma.overtime.count({ where: { ...where, status: 'PENDING' } }),
      prisma.overtime.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.overtime.count({ where: { ...where, status: 'REJECTED' } }),
    ]);

    const totalOvertimeHours = allRecords.reduce((sum, r) => sum + (r.overtimeHours || 0), 0);
    const totalOvertimeCost = allRecords.reduce((sum, r) => sum + (r.overtimeAmount || 0), 0);

    return sendSuccess(res, {
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalOvertimeCost: Math.round(totalOvertimeCost * 100) / 100,
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: pendingCount + approvedCount + rejectedCount,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/overtime/:id/approve
const approveOvertime = async (req, res, next) => {
  try {
    const existing = await prisma.overtime.findUnique({
      where: { id: req.params.id },
      include: { employee: true },
    });

    if (!existing) return sendError(res, 'Overtime record not found.', 404);

    let approverName = req.user.email;
    if (req.user.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: req.user.employeeId },
        select: { firstName: true, lastName: true },
      });
      if (emp) approverName = `${emp.firstName} ${emp.lastName}`.trim();
    }

    const updated = await prisma.overtime.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user.userId,
        approvedByName: approverName,
        approvedAt: new Date(),
        rejectedById: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

// POST /api/overtime/:id/reject
const rejectOvertime = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
      return sendError(res, 'Rejection reason is required.', 400);
    }

    const existing = await prisma.overtime.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Overtime record not found.', 404);

    let rejectorName = req.user.email;
    if (req.user.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: req.user.employeeId },
        select: { firstName: true, lastName: true },
      });
      if (emp) rejectorName = `${emp.firstName} ${emp.lastName}`.trim();
    }

    const updated = await prisma.overtime.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedById: req.user.userId,
        rejectedByName: rejectorName,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/overtime/:id/correct
const correctOvertime = async (req, res, next) => {
  try {
    const { overtimeHours, correctionReason } = req.body;

    if (overtimeHours === undefined || overtimeHours === null || Number(overtimeHours) < 0) {
      return sendError(res, 'Valid non-negative overtime hours is required.', 400);
    }

    if (!correctionReason || typeof correctionReason !== 'string' || !correctionReason.trim()) {
      return sendError(res, 'Correction reason is required for audit trail.', 400);
    }

    const existing = await prisma.overtime.findUnique({ where: { id: req.params.id } });
    if (!existing) return sendError(res, 'Overtime record not found.', 404);

    let correctorName = req.user.email;
    if (req.user.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: req.user.employeeId },
        select: { firstName: true, lastName: true },
      });
      if (emp) correctorName = `${emp.firstName} ${emp.lastName}`.trim();
    }

    const newHours = Math.round(Number(overtimeHours) * 100) / 100;
    const newAmount = Math.round(newHours * (existing.overtimeRate || 0) * 100) / 100;

    const updated = await prisma.overtime.update({
      where: { id: req.params.id },
      data: {
        overtimeHours: newHours,
        overtimeAmount: newAmount,
        isManualCorrection: true,
        originalHours: existing.originalHours ?? existing.overtimeHours,
        correctedById: req.user.userId,
        correctedByName: correctorName,
        correctionReason: correctionReason.trim(),
        correctedAt: new Date(),
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOvertimeRecords,
  getMyOvertime,
  getOvertimeSummary,
  approveOvertime,
  rejectOvertime,
  correctOvertime,
};
