const prisma = require('../config/prisma');
const { CreatePayrunSchema } = require('../validators/schemas');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { computeEmployeePayroll } = require('../services/payrollEngine');
const { validatePayrun } = require('../services/payrollValidation');
const { detectAnomalies } = require('../services/payrollAnomaly');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');

// ============================================================
// PAYRUNS
// ============================================================

const getPayruns = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
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

// POST /api/payruns — Create payrun with selected employees
const createPayrun = async (req, res, next) => {
  try {
    const { name, periodStart, periodEnd, salaryStructureId, employeeIds, notes } = CreatePayrunSchema.parse(req.body);

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

    // Get creator employee
    const creatorEmployee = req.user.employeeId
      ? await prisma.employee.findUnique({ where: { id: req.user.employeeId } })
      : null;

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
      for (const employeeId of employeeIds) {
        await tx.payslip.create({
          data: {
            payrunId: createdPayrun.id,
            employeeId,
            salaryStructureId,
            periodStart: new Date(periodStart),
            periodEnd: new Date(periodEnd),
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
    const payrun = await prisma.payrun.findUnique({
      where: { id: req.params.id },
      include: {
        payslips: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true, email: true, employeeCode: true } },
            lines: { orderBy: { sequence: 'asc' } },
            salaryStructure: { select: { name: true } },
            contract: { select: { position: true } },
          },
        },
      },
    });

    if (!payrun) return sendError(res, 'Payrun not found.', 404);
    if (!['PAID', 'VALIDATED'].includes(payrun.status)) {
      return sendError(res, 'Payrun must be validated or paid before sending payslips.', 400);
    }

    const results = [];

    for (const payslip of payrun.payslips) {
      const employee = payslip.employee;
      if (!employee.email) {
        results.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: null,
          status: 'SKIPPED',
          error: 'No email address',
        });
        continue;
      }

      try {
        // Generate PDF buffer
        const pdfBuffer = await pdfService.generatePayslipPDF(payslip, payrun);

        // Send email
        await emailService.sendPayslipEmail({
          to: employee.email,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          payslip,
          payrun,
          pdfBuffer,
        });

        // Update payslip
        await prisma.payslip.update({
          where: { id: payslip.id },
          data: { emailSent: true, emailSentAt: new Date(), emailError: null },
        });

        results.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          status: 'SENT',
        });
      } catch (err) {
        await prisma.payslip.update({
          where: { id: payslip.id },
          data: { emailError: err.message },
        });

        results.push({
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    const sent = results.filter((r) => r.status === 'SENT').length;
    const failed = results.filter((r) => r.status === 'FAILED').length;
    const skipped = results.filter((r) => r.status === 'SKIPPED').length;

    return sendSuccess(res, {
      message: `${sent} payslip(s) sent successfully, ${failed} failed, ${skipped} skipped.`,
      results,
      sent,
      failed,
      skipped,
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// PAYSLIPS
// ============================================================

const getPayslips = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employeeId, payrunId, status, periodStart, periodEnd } = req.query;
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
        payrun: { select: { id: true, name: true, status: true, periodStart: true, periodEnd: true } },
        contract: { select: { id: true, wage: true, position: true } },
        salaryStructure: { select: { id: true, name: true } },
        lines: { orderBy: { sequence: 'asc' } },
      },
    });

    if (!payslip) return sendError(res, 'Payslip not found.', 404);

    // EMPLOYEE can only see own payslips
    if (req.user.role === 'EMPLOYEE' && payslip.employeeId !== req.user.employeeId) {
      return sendError(res, 'Access denied.', 403);
    }

    return sendSuccess(res, payslip);
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
  computePayrun,
  validatePayrunAction,
  markPayrunPaid,
  sendPayslips,
  getPayslips,
  getPayslip,
  downloadPayslipPDF,
};
