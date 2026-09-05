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
const emailService = require('../services/emailService');

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
    const { page = 1, limit = 10, employeeId, timeOffTypeId, status } = req.query;
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
    const { page = 1, limit = 10, employeeId, timeOffTypeId, status, startDate, endDate } = req.query;
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
    const employeeId = data.employeeId || req.user.employeeId;

    if (!employeeId) {
      return sendError(res, 'No employee profile linked to your account.', 400);
    }

    // Employees can only create for themselves
    if (req.user.role === 'EMPLOYEE' && employeeId !== req.user.employeeId) {
      return sendError(res, 'You can only create leave requests for yourself.', 403);
    }

    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate < startDate) {
      return sendError(res, 'End date cannot be before start date.', 400);
    }

    // Check if timeOffType exists
    const timeOffType = await prisma.timeOffType.findUnique({ where: { id: data.timeOffTypeId } });
    if (!timeOffType) return sendError(res, 'Leave type not found.', 404);

    // Check annual leave quota & balance for employee
    const balance = await calculateEmployeeLeaveBalance(employeeId);
    if (data.duration > balance.remainingDays) {
      return sendError(
        res,
        `Leave request exceeds your available leave balance! You requested ${data.duration} day(s), but only have ${balance.remainingDays} day(s) remaining out of your annual quota of ${balance.annualQuota} days.`,
        400
      );
    }

    const request = await prisma.timeOffRequest.create({
      data: {
        ...data,
        employeeId,
        startDate,
        endDate,
        status: 'PENDING',
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    // Notify HRs via email
    (async () => {
      try {
        const hrUsers = await prisma.user.findMany({
          where: {
            role: { in: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
            isActive: true,
          },
          select: { email: true },
        });
        const hrEmails = Array.from(new Set(hrUsers.map((u) => u.email).filter(Boolean)));
        if (hrEmails.length > 0) {
          const empName = `${request.employee.firstName || ''} ${request.employee.lastName || ''}`.trim();
          await emailService.sendLeaveRequestNotificationToHR({
            hrEmails,
            employeeName: empName,
            employeeCode: request.employee.employeeCode || '',
            leaveType: request.timeOffType.name,
            startDate: request.startDate,
            endDate: request.endDate,
            duration: request.duration,
            reason: request.reason,
          });
        }
      } catch (emailErr) {
        console.error('Failed to send HR leave notification email:', emailErr);
      }
    })();

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
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    // Send email notification to employee
    if (updated.employee?.email) {
      (async () => {
        try {
          const empName = `${updated.employee.firstName || ''} ${updated.employee.lastName || ''}`.trim();
          await emailService.sendLeaveStatusNotificationToEmployee({
            to: updated.employee.email,
            employeeName: empName,
            status: 'APPROVED',
            leaveType: updated.timeOffType.name,
            startDate: updated.startDate,
            endDate: updated.endDate,
            duration: updated.duration,
            approvedByName: updated.approvedByName,
          });
        } catch (emailErr) {
          console.error('Failed to send employee leave approval email:', emailErr);
        }
      })();
    }

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
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        timeOffType: { select: { id: true, name: true } },
      },
    });

    // Send email notification to employee
    if (updated.employee?.email) {
      (async () => {
        try {
          const empName = `${updated.employee.firstName || ''} ${updated.employee.lastName || ''}`.trim();
          await emailService.sendLeaveStatusNotificationToEmployee({
            to: updated.employee.email,
            employeeName: empName,
            status: 'REJECTED',
            leaveType: updated.timeOffType.name,
            startDate: updated.startDate,
            endDate: updated.endDate,
            duration: updated.duration,
            rejectionReason: updated.rejectionReason,
          });
        } catch (emailErr) {
          console.error('Failed to send employee leave rejection email:', emailErr);
        }
      })();
    }

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

// Helper to calculate employee's leave balance in current 1-year cycle
async function calculateEmployeeLeaveBalance(employeeId) {
  const now = new Date();
  
  // Find employee's active contract
  const contract = await prisma.contract.findFirst({
    where: {
      employeeId,
      status: 'ACTIVE',
    },
    select: { annualLeaveQuota: true, startDate: true },
  });

  const annualQuota = contract?.annualLeaveQuota ?? 24;

  // Determine current 1-year cycle start date (Contract anniversary or Jan 1)
  let cycleStart = new Date(now.getFullYear(), 0, 1);
  if (contract?.startDate) {
    const cStart = new Date(contract.startDate);
    cycleStart = new Date(cStart);
    while (new Date(cycleStart.getFullYear() + 1, cycleStart.getMonth(), cycleStart.getDate()) <= now) {
      cycleStart.setFullYear(cycleStart.getFullYear() + 1);
    }
  }

  // Get all approved leave requests in current cycle
  const approvedRequests = await prisma.timeOffRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { gte: cycleStart },
    },
    select: { duration: true },
  });

  // Get all pending leave requests in current cycle
  const pendingRequests = await prisma.timeOffRequest.findMany({
    where: {
      employeeId,
      status: 'PENDING',
      startDate: { gte: cycleStart },
    },
    select: { duration: true },
  });

  const approvedDays = approvedRequests.reduce((sum, r) => sum + r.duration, 0);
  const pendingDays = pendingRequests.reduce((sum, r) => sum + r.duration, 0);
  const remainingDays = Math.max(0, annualQuota - approvedDays);

  return {
    annualQuota,
    approvedDays,
    pendingDays,
    remainingDays,
    cycleStart,
  };
}

const getLeaveBalance = async (req, res, next) => {
  try {
    const employeeId = req.query.employeeId || req.user.employeeId;
    if (!employeeId) {
      return sendError(res, 'No employee ID provided.', 400);
    }

    const balance = await calculateEmployeeLeaveBalance(employeeId);
    return sendSuccess(res, balance);
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
  getLeaveBalance,
  calculateEmployeeLeaveBalance,
};
