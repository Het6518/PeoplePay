const prisma = require('../config/prisma');
const { CreatePayrunSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { computeEmployeePayroll } = require('../services/payrollEngine');
const { validatePayrun } = require('../services/payrollValidation');
const { detectAnomalies } = require('../services/payrollAnomaly');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');
const payslipQueue = require('../services/payslipQueue');
const { logAuditAction } = require('../utils/auditLogger');

// ============================================================
// PAYRUNS
// ============================================================

const getPayruns = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [payruns, total] = await Promise.all([
      prisma.payrun.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          salaryStructure: { select: { id: true, name: true } },
          _count: { select: { payslips: true } },
        },
      }),
      prisma.payrun.count({ where }),
    ]);

    return sendPaginated(res, payruns, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getPayrun = async (req, res, next) => {
  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: {
        salaryStructure: {
          include: {
            rules: { where: { isActive: true }, orderBy: { sequence: 'asc' } },
          },
        },
        payslips: {
          include: {
            employee: {
              select: {
                id: true, firstName: true, lastName: true, employeeCode: true,
                department: { select: { id: true, name: true } },
              },
            },
            contract: { select: { id: true, wage: true, position: true } },
            lines: { orderBy: { sequence: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!payrun) return sendError(res, 'Payrun not found.', 404);
    return sendSuccess(res, payrun);
  } catch (err) {
    next(err);
  }
};

const formatShortDate = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateISO = (dateObj) => {
  if (!dateObj) return '';
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateOverlapsForEmployees = async (periodStartStr, periodEndStr, employeeIds) => {
  const newStart = new Date(periodStartStr);
  newStart.setHours(0, 0, 0, 0);
  const newEnd = new Date(periodEndStr);
  newEnd.setHours(23, 59, 59, 999);

  const where = {
    status: { in: ['PAID', 'VALIDATED'] },
  };
  if (employeeIds && Array.isArray(employeeIds) && employeeIds.length > 0) {
    where.employeeId = { in: employeeIds };
  }

  const existingPayslips = await prisma.payslip.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
      payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
    },
  });

  const results = {};

  for (const payslip of existingPayslips) {
    const empId = payslip.employeeId;
    const pStart = payslip.effectivePeriodStart ? new Date(payslip.effectivePeriodStart) : new Date(payslip.periodStart);
    pStart.setHours(0, 0, 0, 0);
    const pEnd = payslip.effectivePeriodEnd ? new Date(payslip.effectivePeriodEnd) : new Date(payslip.periodEnd);
    pEnd.setHours(23, 59, 59, 999);

    if (pStart <= newEnd && pEnd >= newStart) {
      if (!results[empId]) {
        const empName = payslip.employee ? `${payslip.employee.firstName || ''} ${payslip.employee.lastName || ''}`.trim() : 'Employee';
        results[empId] = {
          employeeId: empId,
          employeeName: empName,
          hasOverlap: true,
          overlappingPayslips: [],
          existingRanges: [],
        };
      }
      results[empId].overlappingPayslips.push({
        payslipId: payslip.id,
        payrunName: payslip.payrun?.name || 'Payrun',
        periodStart: pStart,
        periodEnd: pEnd,
        formattedRange: `${formatShortDate(pStart)} – ${formatShortDate(pEnd)}`,
      });
      results[empId].existingRanges.push({ start: pStart, end: pEnd });
    }
  }

  for (const empId of Object.keys(results)) {
    const empData = results[empId];
    const existingRanges = empData.existingRanges;

    const cur = new Date(newStart);
    const freeDays = [];

    while (cur <= newEnd) {
      const curTime = cur.getTime();
      const isCovered = existingRanges.some(r => curTime >= r.start.getTime() && curTime <= r.end.getTime());
      if (!isCovered) {
        freeDays.push(new Date(cur));
      }
      cur.setDate(cur.getDate() + 1);
    }

    const remainders = [];
    if (freeDays.length > 0) {
      let rStart = freeDays[0];
      let rPrev = freeDays[0];

      for (let i = 1; i < freeDays.length; i++) {
        const d = freeDays[i];
        const diffMs = d.getTime() - rPrev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          rPrev = d;
        } else {
          remainders.push({
            startDate: formatDateISO(rStart),
            endDate: formatDateISO(rPrev),
            formatted: `${formatShortDate(rStart)} – ${formatShortDate(rPrev)}`,
          });
          rStart = d;
          rPrev = d;
        }
      }
      remainders.push({
        startDate: formatDateISO(rStart),
        endDate: formatDateISO(rPrev),
        formatted: `${formatShortDate(rStart)} – ${formatShortDate(rPrev)}`,
      });
    }

    empData.remainders = remainders;
    const firstPayslip = empData.overlappingPayslips[0];
    empData.summaryMessage = `Already paid ${firstPayslip ? firstPayslip.formattedRange : ''} for this period range.`;
  }

  return results;
};

const checkOverlaps = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, employeeIds } = req.body;
    if (!periodStart || !periodEnd) {
      return sendError(res, 'periodStart and periodEnd are required.', 400);
    }

    const overlaps = await calculateOverlapsForEmployees(periodStart, periodEnd, employeeIds);
    return sendSuccess(res, { overlaps });
  } catch (err) {
    next(err);
  }
};

// POST /api/payruns — Create payrun with selected employees
const createPayrun = async (req, res, next) => {
  try {
    const parsed = CreatePayrunSchema.parse(req.body);
    const { name, periodStart, periodEnd, salaryStructureId, notes } = parsed;

    let employeeSelections = [];
    if (parsed.employeeSelections && parsed.employeeSelections.length > 0) {
      employeeSelections = parsed.employeeSelections;
    } else if (parsed.employeeIds && parsed.employeeIds.length > 0) {
      employeeSelections = parsed.employeeIds.map(id => ({
        employeeId: id,
        effectivePeriodStart: null,
        effectivePeriodEnd: null,
        isOverride: false,
        overrideWarning: null,
        overrideBy: null,
        overrideAt: null,
      }));
    }

    // Validate period
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    if (end <= start) {
      return sendError(res, 'Period end must be after period start.', 400);
    }

    // Check for existing paid payrun for this period
    const existingPaid = await prisma.payrun.findFirst({
      where: {
        salaryStructureId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'PAID',
      },
    });

    if (existingPaid) {
      return sendError(
        res,
        `A paid payrun already exists for this period: "${existingPaid.name}". Cannot create duplicate.`,
        409
      );
    }

    // Get creator employee / user
    const creatorEmployee = req.user.employeeId
      ? await prisma.employee.findUnique({ where: { id: req.user.employeeId } })
      : null;

    const creatorName = req.user.email || (creatorEmployee ? `${creatorEmployee.firstName} ${creatorEmployee.lastName}` : 'HR Manager');

    // Create payrun + draft payslips in a single transaction
    const payrun = await prisma.$transaction(async (tx) => {
      const createdPayrun = await tx.payrun.create({
        data: {
          name,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          salaryStructureId,
          notes,
          status: 'DRAFT',
          createdById: creatorEmployee?.id || null,
        },
      });

      // Create placeholder DRAFT payslips for selected employees
      for (const sel of employeeSelections) {
        await tx.payslip.create({
          data: {
            payrunId: createdPayrun.id,
            employeeId: sel.employeeId,
            salaryStructureId,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
            effectivePeriodStart: sel.effectivePeriodStart ? new Date(sel.effectivePeriodStart) : null,
            effectivePeriodEnd: sel.effectivePeriodEnd ? new Date(sel.effectivePeriodEnd) : null,
            isOverride: sel.isOverride || false,
            overrideWarning: sel.overrideWarning || null,
            overrideBy: sel.isOverride ? (sel.overrideBy || creatorName) : null,
            overrideAt: sel.isOverride ? (sel.overrideAt ? new Date(sel.overrideAt) : new Date()) : null,
            status: 'DRAFT',
          },
        });
      }

      return createdPayrun;
    });

    const fullPayrun = await prisma.payrun.findUnique({
      where: { id: payrun.id },
      include: {
        salaryStructure: { select: { id: true, name: true } },
        _count: { select: { payslips: true } },
      },
    });

    await logAuditAction({
      actionType: 'PAYRUN_CREATE',
      entityType: 'PAYRUN',
      entityId: fullPayrun.id,
      description: `Created payrun "${fullPayrun.name}" with ${fullPayrun._count.payslips} employees`,
      performedBy: req.user?.email || 'Payroll Manager',
    });

    return sendSuccess(res, fullPayrun, 201);
  } catch (err) {
    next(err);
  }
};

// POST /api/payruns/:id/compute
const computePayrun = async (req, res, next) => {
  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: {
        salaryStructure: {
          include: {
            rules: { where: { isActive: true }, orderBy: { sequence: 'asc' } },
          },
        },
        payslips: {
          include: {
            employee: {
              include: { workingSchedule: { include: { days: true } } },
            },
          },
        },
      },
    });

    if (!payrun) return sendError(res, 'Payrun not found.', 404);
    if (payrun.status === 'PAID') return sendError(res, 'Cannot recompute a paid payrun.', 400);
    if (!payrun.salaryStructure) return sendError(res, 'Salary structure not found.', 400);
    if (payrun.salaryStructure.rules.length === 0) {
      return sendError(res, 'Salary structure has no active rules. Please configure salary rules before computing.', 400);
    }

    const results = { success: [], errors: [] };
    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    await prisma.$transaction(async (tx) => {
      for (const payslip of payrun.payslips) {
        const result = await computeEmployeePayroll({
          employee: payslip.employee,
          payrun,
          payslip,
          salaryStructureId: payrun.salaryStructureId,
          rules: payrun.salaryStructure.rules,
          prisma: tx,
        });

        if (!result.success) {
          // Update payslip with error note
          await tx.payslip.update({
            where: { id: payslip.id },
            data: {
              status: 'DRAFT',
              hasErrors: true,
              validationNotes: { errors: [result.error] },
            },
          });
          results.errors.push({ employeeId: result.employeeId, error: result.error });
          continue;
        }

        // Delete existing lines before recompute
        await tx.payslipLine.deleteMany({ where: { payslipId: payslip.id } });

        // Create payslip lines
        await tx.payslipLine.createMany({
          data: result.lines.map((line) => ({ ...line, payslipId: payslip.id })),
        });

        // Update payslip
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            contractId: result.contractId,
            salaryStructureId: result.salaryStructureId,
            workedDays: result.workedDays,
            totalWorkingDays: result.totalWorkingDays,
            leaveDays: result.leaveDays,
            overtimeHours: result.overtimeHours,
            overtimeRate: result.overtimeRate || 0,
            overtimeAmount: result.overtimeAmount || 0,
            grossSalary: result.grossSalary,
            totalDeductions: result.totalDeductions,
            netSalary: result.netSalary,
            status: 'COMPUTED',
            hasErrors: false,
            hasWarnings: false,
            validationNotes: null,
          },
        });

        totalGross += result.grossSalary;
        totalDeductions += result.totalDeductions;
        totalNet += result.netSalary;
        results.success.push({ employeeId: result.employeeId });
      }

      // Update payrun totals and status
      await tx.payrun.update({
        where: { id: payrun.id },
        data: {
          totalGross: Math.round(totalGross * 100) / 100,
          totalDeductions: Math.round(totalDeductions * 100) / 100,
          totalNet: Math.round(totalNet * 100) / 100,
          status: 'COMPUTED',
          computedAt: new Date(),
        },
      });
    }, { timeout: 30000 });

    return sendSuccess(res, {
      message: `Computation complete. ${results.success.length} payslips computed, ${results.errors.length} errors.`,
      successCount: results.success.length,
      errorCount: results.errors.length,
      errors: results.errors,
      totalGross,
      totalDeductions,
      totalNet,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payruns/:id/validate
const validatePayrunAction = async (req, res, next) => {
  try {
    const payrun = await prisma.payrun.findUnique({ where: { id: req.params.id } });
    if (!payrun) return sendError(res, 'Payrun not found.', 404);
    if (payrun.status === 'PAID') return sendError(res, 'Cannot validate a paid payrun.', 400);

    // Run validation
    const validationIssues = await validatePayrun(req.params.id);

    // Run anomaly detection
    const anomalies = await detectAnomalies(req.params.id);

    const allIssues = [...validationIssues, ...anomalies];
    const hasErrors = allIssues.some((i) => i.severity === 'ERROR');
    const hasWarnings = allIssues.some((i) => i.severity === 'WARNING');

    // Update payslips with warning/error flags
    await prisma.$transaction(async (tx) => {
      // Group issues by employee
      const issuesByEmployee = {};
      for (const issue of allIssues) {
        if (issue.employeeId) {
          if (!issuesByEmployee[issue.employeeId]) issuesByEmployee[issue.employeeId] = [];
          issuesByEmployee[issue.employeeId].push(issue);
        }
      }

      for (const payslip of await tx.payslip.findMany({ where: { payrunId: payrun.id } })) {
        const issues = issuesByEmployee[payslip.employeeId] || [];
        await tx.payslip.update({
          where: { id: payslip.id },
          data: {
            hasErrors: issues.some((i) => i.severity === 'ERROR'),
            hasWarnings: issues.some((i) => i.severity === 'WARNING'),
            validationNotes: { issues },
          },
        });
      }

      // Update payrun status to VALIDATED
      await tx.payrun.update({
        where: { id: payrun.id },
        data: { status: 'VALIDATED', validatedAt: new Date() },
      });
    });

    return sendSuccess(res, {
      issues: allIssues,
      totalErrors: allIssues.filter((i) => i.severity === 'ERROR').length,
      totalWarnings: allIssues.filter((i) => i.severity === 'WARNING').length,
      canProceedToPay: true,
      payrunStatus: 'VALIDATED',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/payruns/:id/mark-paid
const markPayrunPaid = async (req, res, next) => {
  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: { payslips: true },
    });

    if (!payrun) return sendError(res, 'Payrun not found.', 404);
    if (payrun.status === 'PAID') return sendError(res, 'Payrun is already marked as paid.', 400);
    if (!['VALIDATED', 'COMPUTED'].includes(payrun.status)) {
      return sendError(res, 'Payrun must be validated before marking as paid.', 400);
    }

    // Check for critical errors
    const validationIssues = await validatePayrun(req.params.id);
    const criticalErrors = validationIssues.filter((i) => i.severity === 'ERROR');

    if (criticalErrors.length > 0) {
      return sendError(
        res,
        `Cannot mark as paid. ${criticalErrors.length} critical error(s) must be resolved first.`,
        400,
        criticalErrors
      );
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.payrun.update({
        where: { id: payrun.id },
        data: { status: 'PAID', paidAt: now, finalizedAt: now },
      });

      await tx.payslip.updateMany({
        where: { payrunId: payrun.id, status: { in: ['COMPUTED', 'VALIDATED'] } },
        data: { status: 'PAID' },
      });
    });

    return sendSuccess(res, { message: 'Payrun marked as paid successfully.', paidAt: now });
  } catch (err) {
    next(err);
  }
};

// POST /api/payruns/:id/send-payslips
const sendPayslips = async (req, res, next) => {
  try {
    const dispatchJob = await payslipQueue.enqueuePayslipDispatch(req.params.id);
    return sendSuccess(res, dispatchJob, 202);
  } catch (err) {
    if (err.message === 'Payrun not found') {
      return sendError(res, err.message, 404);
    }
    if (err.message.includes('must be validated or paid')) {
      return sendError(res, err.message, 400);
    }
    next(err);
  }
};

// GET /api/payruns/:id/send-payslips/status
const getPayslipDispatchStatus = async (req, res, next) => {
  try {
    const job = await payslipQueue.getLatestJobForPayrun(req.params.id);
    if (!job) {
      return sendSuccess(res, {
        status: 'IDLE',
        message: 'No dispatch job currently running for this payrun.',
      });
    }
    return sendSuccess(res, job);
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PAYSLIPS
// ============================================================

const getPayslips = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employeeId, payrunId, status, periodStart, periodEnd } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (req.user.role === 'EMPLOYEE') where.employeeId = req.user.employeeId;
    else if (employeeId) where.employeeId = employeeId;
    if (payrunId) where.payrunId = payrunId;
    if (status) where.status = status;
    if (periodStart) where.periodStart = { gte: new Date(periodStart) };
    if (periodEnd) where.periodEnd = { lte: new Date(periodEnd) };

    const [payslips, total] = await Promise.all([
      prisma.payslip.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { periodStart: 'desc' },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          payrun: { select: { id: true, name: true, status: true } },
          salaryStructure: { select: { id: true, name: true } },
        },
      }),
      prisma.payslip.count({ where }),
    ]);

    return sendPaginated(res, payslips, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getPayslip = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true, email: true, phone: true,
            department: { select: { name: true } },
            workingSchedule: { select: { name: true } },
          },
        },
        payrun: { 
          select: { 
            id: true, name: true, status: true, periodStart: true, periodEnd: true,
            salaryStructure: { select: { id: true, name: true } },
          } 
        },
        contract: { 
          select: { 
            id: true, wage: true, position: true,
            salaryStructure: { select: { id: true, name: true } },
          } 
        },
        salaryStructure: { select: { id: true, name: true } },
        lines: {
          orderBy: { sequence: 'asc' },
          include: { salaryRule: true },
        },
      },
    });

    if (!payslip) return sendError(res, 'Payslip not found.', 404);

    // EMPLOYEE can only see own payslips
    if (req.user.role === 'EMPLOYEE' && payslip.employeeId !== req.user.employeeId) {
      return sendError(res, 'Access denied.', 403);
    }

    const pStart = payslip.effectivePeriodStart ? new Date(payslip.effectivePeriodStart) : new Date(payslip.periodStart);
    const pEnd = payslip.effectivePeriodEnd ? new Date(payslip.effectivePeriodEnd) : new Date(payslip.periodEnd);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: payslip.employeeId,
        date: { gte: pStart, lte: pEnd },
      },
      select: { status: true, workedHours: true },
    });

    const attendanceSummary = {
      present: 0,
      late: 0,
      absent: 0,
      overtime: 0,
      missingCheckout: 0,
      manualCorrection: 0,
      leaveDays: payslip.leaveDays || 0,
      totalLoggedHours: 0,
    };

    for (const a of attendances) {
      if (a.workedHours) attendanceSummary.totalLoggedHours += a.workedHours;
      switch (a.status) {
        case 'PRESENT': attendanceSummary.present++; break;
        case 'LATE': attendanceSummary.late++; break;
        case 'ABSENT': attendanceSummary.absent++; break;
        case 'OVERTIME': attendanceSummary.overtime++; break;
        case 'MISSING_CHECKOUT': attendanceSummary.missingCheckout++; break;
        case 'MANUAL_CORRECTION': attendanceSummary.manualCorrection++; break;
      }
    }
    attendanceSummary.totalLoggedHours = Math.round(attendanceSummary.totalLoggedHours * 100) / 100;

    return sendSuccess(res, {
      ...payslip,
      attendanceSummary,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/payslips/:id/pdf
const downloadPayslipPDF = async (req, res, next) => {
  try {
    const payslip = await prisma.payslip.findUnique({
      where: { id: req.params.id },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
          },
        },
        payrun: true,
        contract: true,
        salaryStructure: true,
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) return sendError(res, 'Payslip not found.', 404);

    // EMPLOYEE can only see own
    if (req.user.role === 'EMPLOYEE' && payslip.employeeId !== req.user.employeeId) {
      return sendError(res, 'Access denied.', 403);
    }

    const pStart = payslip.effectivePeriodStart ? new Date(payslip.effectivePeriodStart) : new Date(payslip.periodStart);
    const pEnd = payslip.effectivePeriodEnd ? new Date(payslip.effectivePeriodEnd) : new Date(payslip.periodEnd);

    const attendances = await prisma.attendance.findMany({
      where: {
        employeeId: payslip.employeeId,
        date: { gte: pStart, lte: pEnd },
      },
      select: { status: true, workedHours: true },
    });

    const attendanceSummary = {
      present: 0,
      late: 0,
      absent: 0,
      overtime: 0,
      missingCheckout: 0,
      manualCorrection: 0,
      leaveDays: payslip.leaveDays || 0,
      totalLoggedHours: 0,
    };

    for (const a of attendances) {
      if (a.workedHours) attendanceSummary.totalLoggedHours += a.workedHours;
      switch (a.status) {
        case 'PRESENT': attendanceSummary.present++; break;
        case 'LATE': attendanceSummary.late++; break;
        case 'ABSENT': attendanceSummary.absent++; break;
        case 'OVERTIME': attendanceSummary.overtime++; break;
        case 'MISSING_CHECKOUT': attendanceSummary.missingCheckout++; break;
        case 'MANUAL_CORRECTION': attendanceSummary.manualCorrection++; break;
      }
    }
    payslip.attendanceSummary = attendanceSummary;

    const pdfBuffer = await pdfService.generatePayslipPDF(payslip, payslip.payrun);

    const filename = `payslip_${payslip.employee.employeeCode}_${payslip.periodStart.toISOString().slice(0, 7)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayruns,
  getPayrun,
  createPayrun,
  checkOverlaps,
  computePayrun,
  validatePayrunAction,
  markPayrunPaid,
  sendPayslips,
  getPayslipDispatchStatus,
  getPayslips,
  getPayslip,
  downloadPayslipPDF,
};
