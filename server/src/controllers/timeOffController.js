const prisma = require('../config/prisma');
const {
  CreateTimeOffTypeSchema,
  UpdateTimeOffTypeSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  CreateTimeOffRequestSchema,
  ApproveRejectRequestSchema,
} = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// ============================================================
// TIME OFF TYPES
// ============================================================

const getTimeOffTypes = async (req, res, next) => {
  try {
    const types = await prisma.timeOffType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { allocations: true, requests: true } } },
    });
    return sendSuccess(res, types);
  } catch (err) {
    next(err);
  }
};

const createTimeOffType = async (req, res, next) => {
  try {
    const data = CreateTimeOffTypeSchema.parse(req.body);
    const type = await prisma.timeOffType.create({ data });
    return sendSuccess(res, type, 201);
  } catch (err) {
    next(err);
  }
};

const updateTimeOffType = async (req, res, next) => {
  try {
    const data = UpdateTimeOffTypeSchema.parse(req.body);
    const type = await prisma.timeOffType.update({ where: { id: req.params.id }, data });
    return sendSuccess(res, type);
  } catch (err) {
    next(err);
  }
};

const deleteTimeOffType = async (req, res, next) => {
  try {
    const type = await prisma.timeOffType.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { allocations: true, requests: true } } },
    });
    if (!type) return sendError(res, 'Time off type not found.', 404);
    if (type._count.allocations > 0 || type._count.requests > 0) {
      return sendError(res, 'Cannot delete type with existing allocations or requests.', 400);
    }
    await prisma.timeOffType.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Time off type deleted.' });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// ALLOCATIONS
// ============================================================

const getAllocations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employeeId, timeOffTypeId, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (req.user.role === 'EMPLOYEE') where.employeeId = req.user.employeeId;
    else if (employeeId) where.employeeId = employeeId;
    if (timeOffTypeId) where.timeOffTypeId = timeOffTypeId;
    if (status) where.status = status;

    const [allocations, total] = await Promise.all([
      prisma.timeOffAllocation.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          timeOffType: { select: { id: true, name: true, unit: true, color: true } },
        },
      }),
      prisma.timeOffAllocation.count({ where }),
    ]);

    return sendPaginated(res, allocations, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const createAllocation = async (req, res, next) => {
  try {
    const data = CreateAllocationSchema.parse(req.body);

    const allocation = await prisma.timeOffAllocation.create({
      data: {
        ...data,
        remainingAmount: data.allocatedAmount,
        validFrom: new Date(data.validFrom),
        validTo: new Date(data.validTo),
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, allocation, 201);
  } catch (err) {
    next(err);
  }
};

const updateAllocation = async (req, res, next) => {
  try {
    const data = UpdateAllocationSchema.parse(req.body);
    if (data.validFrom) data.validFrom = new Date(data.validFrom);
    if (data.validTo) data.validTo = new Date(data.validTo);

    const allocation = await prisma.timeOffAllocation.update({
      where: { id: req.params.id },
      data,
    });
    return sendSuccess(res, allocation);
  } catch (err) {
    next(err);
  }
};

const approveAllocation = async (req, res, next) => {
  try {
    const allocation = await prisma.timeOffAllocation.findUnique({ where: { id: req.params.id } });
    if (!allocation) return sendError(res, 'Allocation not found.', 404);
    if (allocation.status !== 'PENDING') {
      return sendError(res, 'Only pending allocations can be approved.', 400);
    }

    const approver = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const updated = await prisma.timeOffAllocation.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: approver?.id,
        approvedByName: approver ? `${approver.firstName} ${approver.lastName}` : 'HR Manager',
        approvedAt: new Date(),
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

const refuseAllocation = async (req, res, next) => {
  try {
    const updated = await prisma.timeOffAllocation.update({
      where: { id: req.params.id },
      data: { status: 'REFUSED' },
    });
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

// ============================================================
// TIME OFF REQUESTS
// ============================================================

const getTimeOffRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employeeId, timeOffTypeId, status, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (req.user.role === 'EMPLOYEE') where.employeeId = req.user.employeeId;
    else if (employeeId) where.employeeId = employeeId;
    if (timeOffTypeId) where.timeOffTypeId = timeOffTypeId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    const [requests, total] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          timeOffType: { select: { id: true, name: true, unit: true, color: true } },
        },
      }),
      prisma.timeOffRequest.count({ where }),
    ]);

    return sendPaginated(res, requests, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getTimeOffRequest = async (req, res, next) => {
  try {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        timeOffType: true,
      },
    });
    if (!request) return sendError(res, 'Request not found.', 404);
    return sendSuccess(res, request);
  } catch (err) {
    next(err);
  }
};

const createTimeOffRequest = async (req, res, next) => {
  try {
    const data = CreateTimeOffRequestSchema.parse(req.body);

    // Employees can only create for themselves
    if (req.user.role === 'EMPLOYEE' && data.employeeId !== req.user.employeeId) {
      return sendError(res, 'You can only create leave requests for yourself.', 403);
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      return sendError(res, 'End date cannot be before start date.', 400);
    }

    // Check if timeOffType requires allocation
    const timeOffType = await prisma.timeOffType.findUnique({ where: { id: data.timeOffTypeId } });
    if (!timeOffType) return sendError(res, 'Leave type not found.', 404);

    if (timeOffType.requiresAllocation) {
      // Check approved allocation with sufficient balance
      const allocation = await prisma.timeOffAllocation.findFirst({
        where: {
          employeeId: data.employeeId,
          timeOffTypeId: data.timeOffTypeId,
          status: 'APPROVED',
          validFrom: { lte: startDate },
          validTo: { gte: endDate },
        },
      });

      if (!allocation) {
        return sendError(res, 'No approved leave allocation found for this period.', 400);
      }

      if (allocation.remainingAmount < data.duration) {
        return sendError(
          res,
          `Insufficient leave balance. Available: ${allocation.remainingAmount} ${timeOffType.unit.toLowerCase()}, Requested: ${data.duration}.`,
          400
        );
      }
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        ...data,
        startDate,
        endDate,
        status: timeOffType.requiresApproval ? 'PENDING' : 'APPROVED',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, request, 201);
  } catch (err) {
    next(err);
  }
};

const approveTimeOffRequest = async (req, res, next) => {
  try {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id },
      include: { timeOffType: true },
    });
    if (!request) return sendError(res, 'Request not found.', 404);
    if (request.status !== 'PENDING') {
      return sendError(res, 'Only pending requests can be approved.', 400);
    }

    const approver = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, firstName: true, lastName: true },
    });

    await prisma.$transaction(async (tx) => {
      // Update request status
      await tx.timeOffRequest.update({
        where: { id: req.params.id },
        data: {
          status: 'APPROVED',
          approvedById: approver?.id,
          approvedByName: approver ? `${approver.firstName} ${approver.lastName}` : 'HR Manager',
          approvedAt: new Date(),
        },
      });

      // Deduct from allocation if required
      if (request.timeOffType.requiresAllocation) {
        const allocation = await tx.timeOffAllocation.findFirst({
          where: {
            employeeId: request.employeeId,
            timeOffTypeId: request.timeOffTypeId,
            status: 'APPROVED',
            validFrom: { lte: request.startDate },
            validTo: { gte: request.endDate },
          },
        });

        if (allocation) {
          const newTaken = allocation.takenAmount + request.duration;
          const newRemaining = allocation.allocatedAmount - newTaken;

          if (newRemaining < 0) {
            throw new Error('Insufficient leave balance to approve this request.');
          }

          await tx.timeOffAllocation.update({
            where: { id: allocation.id },
            data: { takenAmount: newTaken, remainingAmount: newRemaining },
          });
        }
      }
    });

    const updated = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

const rejectTimeOffRequest = async (req, res, next) => {
  try {
    const { rejectionReason } = ApproveRejectRequestSchema.parse(req.body);
    const request = await prisma.timeOffRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return sendError(res, 'Request not found.', 404);
    if (request.status !== 'PENDING') {
      return sendError(res, 'Only pending requests can be rejected.', 400);
    }

    const rejector = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, firstName: true, lastName: true },
    });

    const updated = await prisma.timeOffRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'REJECTED',
        rejectedById: rejector?.id,
        rejectedByName: rejector ? `${rejector.firstName} ${rejector.lastName}` : 'HR Manager',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

const cancelTimeOffRequest = async (req, res, next) => {
  try {
    const request = await prisma.timeOffRequest.findUnique({
      where: { id: req.params.id },
      include: { timeOffType: true },
    });
    if (!request) return sendError(res, 'Request not found.', 404);

    // Only employee themselves or HR can cancel
    if (req.user.role === 'EMPLOYEE' && request.employeeId !== req.user.employeeId) {
      return sendError(res, 'You can only cancel your own requests.', 403);
    }

    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      return sendError(res, 'This request cannot be cancelled.', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.timeOffRequest.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });

      // Restore allocation balance if it was approved
      if (request.status === 'APPROVED' && request.timeOffType.requiresAllocation) {
        const allocation = await tx.timeOffAllocation.findFirst({
          where: {
            employeeId: request.employeeId,
            timeOffTypeId: request.timeOffTypeId,
            status: 'APPROVED',
          },
        });

        if (allocation) {
          const newTaken = Math.max(0, allocation.takenAmount - request.duration);
          const newRemaining = allocation.allocatedAmount - newTaken;
          await tx.timeOffAllocation.update({
            where: { id: allocation.id },
            data: { takenAmount: newTaken, remainingAmount: newRemaining },
          });
        }
      }
    });

    return sendSuccess(res, { message: 'Request cancelled successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTimeOffTypes,
  createTimeOffType,
  updateTimeOffType,
  deleteTimeOffType,
  getAllocations,
  createAllocation,
  updateAllocation,
  approveAllocation,
  refuseAllocation,
  getTimeOffRequests,
  getTimeOffRequest,
  createTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  cancelTimeOffRequest,
};
