const prisma = require('../config/prisma');
const { sendSuccess } = require('../utils/response');
const { getDashboardAnomalies } = require('../services/payrollAnomaly');

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, departmentId, employeeType } = req.query;

    const employeeWhere = { status: 'ACTIVE' };
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (employeeType) employeeWhere.employeeType = employeeType;

    const payslipWhere = { status: 'PAID' };
    if (periodStart) payslipWhere.periodStart = { gte: new Date(periodStart) };
    if (periodEnd) payslipWhere.periodEnd = { lte: new Date(periodEnd) };

    const [
      totalEmployees,
      activeContracts,
      payslipAgg,
      payslipCount,
      pendingLeave,
      attendanceToday,
    ] = await Promise.all([
      prisma.employee.count({ where: employeeWhere }),

      prisma.contract.count({ where: { status: 'ACTIVE' } }),

      prisma.payslip.aggregate({
        where: payslipWhere,
        _sum: { netSalary: true, grossSalary: true, totalDeductions: true },
        _count: true,
        _avg: { netSalary: true },
      }),

      prisma.payslip.count({ where: payslipWhere }),

      prisma.timeOffRequest.count({ where: { status: 'PENDING' } }),

      // Today's attendance
      (async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return prisma.attendance.groupBy({
          by: ['status'],
          where: { date: today },
          _count: true,
        });
      })(),
    ]);

    const totalNetPaid = payslipAgg._sum.netSalary || 0;
    const avgSalary = payslipAgg._avg.netSalary || 0;

    // Attendance health
    const presentCount = attendanceToday.find((a) => ['PRESENT', 'LATE', 'OVERTIME', 'MANUAL_CORRECTION'].includes(a.status))?._count || 0;
    const absentCount = attendanceToday.find((a) => a.status === 'ABSENT')?._count || 0;
    const attendanceHealth = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    return sendSuccess(res, {
      totalEmployees,
      activeContracts,
      totalNetPaid: Math.round(totalNetPaid * 100) / 100,
      payslipsGenerated: payslipCount,
      averageSalary: Math.round(avgSalary * 100) / 100,
      pendingLeaveRequests: pendingLeave,
      attendanceHealth,
      presentToday: presentCount,
      absentToday: absentCount,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/payroll-trend
const getPayrollTrend = async (req, res, next) => {
  try {
    const { months = 8 } = req.query;
    const monthsCount = Math.min(Number(months), 24);

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount + 1);
    startDate.setDate(1);

    const payslips = await prisma.payslip.findMany({
      where: {
        status: 'PAID',
        periodStart: { gte: startDate },
      },
      select: {
        periodStart: true,
        grossSalary: true,
        totalDeductions: true,
        netSalary: true,
      },
    });

    // Group by month
    const monthMap = {};
    for (const p of payslips) {
      const key = new Date(p.periodStart).toISOString().slice(0, 7); // YYYY-MM
      if (!monthMap[key]) {
        monthMap[key] = { month: key, gross: 0, deductions: 0, net: 0, count: 0 };
      }
      monthMap[key].gross += p.grossSalary;
      monthMap[key].deductions += p.totalDeductions;
      monthMap[key].net += p.netSalary;
      monthMap[key].count++;
    }

    const trend = Object.values(monthMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        gross: Math.round(m.gross * 100) / 100,
        deductions: Math.round(m.deductions * 100) / 100,
        net: Math.round(m.net * 100) / 100,
        count: m.count,
      }));

    return sendSuccess(res, trend);
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/salary-by-department
const getSalaryByDepartment = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.query;

    const payslipWhere = { status: 'PAID' };
    if (periodStart) payslipWhere.periodStart = { gte: new Date(periodStart) };
    if (periodEnd) payslipWhere.periodEnd = { lte: new Date(periodEnd) };

    const departments = await prisma.department.findMany({
      include: {
        employees: {
          select: {
            id: true,
            payslips: {
              where: payslipWhere,
              select: { grossSalary: true, netSalary: true, totalDeductions: true },
            },
          },
        },
        _count: { select: { employees: true } },
      },
    });

    const result = departments.map((dept) => {
      let totalGross = 0, totalNet = 0, totalDeductions = 0;
      let payslipCount = 0;

      for (const emp of dept.employees) {
        for (const ps of emp.payslips) {
          totalGross += ps.grossSalary;
          totalNet += ps.netSalary;
          totalDeductions += ps.totalDeductions;
          payslipCount++;
        }
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        headcount: dept._count.employees,
        totalGross: Math.round(totalGross * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        avgSalary: payslipCount > 0 ? Math.round((totalNet / payslipCount) * 100) / 100 : 0,
        payslipCount,
      };
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/attendance
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, departmentId } = req.query;

    const where = {};
    if (periodStart || periodEnd) {
      where.date = {};
      if (periodStart) where.date.gte = new Date(periodStart);
      if (periodEnd) where.date.lte = new Date(periodEnd);
    }
    if (departmentId) where.employee = { departmentId };

    const grouped = await prisma.attendance.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const summary = {
      PRESENT: 0, LATE: 0, ABSENT: 0, OVERTIME: 0,
      MISSING_CHECKOUT: 0, MANUAL_CORRECTION: 0,
    };

    for (const g of grouped) {
      summary[g.status] = g._count;
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    const present = summary.PRESENT + summary.LATE + summary.OVERTIME + summary.MANUAL_CORRECTION;
    const coverage = total > 0 ? Math.round((present / total) * 100) : 0;

    return sendSuccess(res, { ...summary, total, coverage });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/time-off
const getTimeOffSummary = async (req, res, next) => {
  try {
    const { periodStart, periodEnd } = req.query;

    const where = {};
    if (periodStart) where.startDate = { gte: new Date(periodStart) };
    if (periodEnd) where.endDate = { lte: new Date(periodEnd) };

    const [byStatus, byType] = await Promise.all([
      prisma.timeOffRequest.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { duration: true },
      }),
      prisma.timeOffRequest.groupBy({
        by: ['timeOffTypeId'],
        where: { ...where, status: 'APPROVED' },
        _count: true,
        _sum: { duration: true },
      }),
    ]);

    const statusMap = {
      PENDING: { count: 0, days: 0 },
      APPROVED: { count: 0, days: 0 },
      REJECTED: { count: 0, days: 0 },
      CANCELLED: { count: 0, days: 0 },
    };

    for (const s of byStatus) {
      statusMap[s.status] = { count: s._count, days: s._sum.duration || 0 };
    }

    // Enrich type data with type names
    const typeIds = byType.map((t) => t.timeOffTypeId);
    const types = await prisma.timeOffType.findMany({
      where: { id: { in: typeIds } },
      select: { id: true, name: true, color: true },
    });

    const typeMap = {};
    for (const t of types) typeMap[t.id] = t;

    const byTypeSummary = byType.map((t) => ({
      typeId: t.timeOffTypeId,
      typeName: typeMap[t.timeOffTypeId]?.name || 'Unknown',
      color: typeMap[t.timeOffTypeId]?.color || '#6366f1',
      count: t._count,
      totalDays: t._sum.duration || 0,
    }));

    return sendSuccess(res, {
      byStatus: statusMap,
      byType: byTypeSummary,
      totalApprovedDays: statusMap.APPROVED.days,
      pendingRequests: statusMap.PENDING.count,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/alerts
const getAlerts = async (req, res, next) => {
  try {
    const alerts = [];

    // 1. Payruns awaiting validation/payment
    const pendingPayruns = await prisma.payrun.findMany({
      where: { status: { in: ['DRAFT', 'COMPUTED'] } },
      select: { id: true, name: true, status: true, periodStart: true },
      take: 5,
    });

    for (const pr of pendingPayruns) {
      alerts.push({
        type: 'PAYRUN_PENDING',
        severity: 'INFO',
        message: `Payrun "${pr.name}" is in ${pr.status} status and needs attention.`,
        link: `/payroll/payruns/${pr.id}`,
      });
    }

    // 2. Pending leave requests
    const pendingLeave = await prisma.timeOffRequest.count({ where: { status: 'PENDING' } });
    if (pendingLeave > 0) {
      alerts.push({
        type: 'PENDING_LEAVE',
        severity: 'WARNING',
        message: `${pendingLeave} leave request(s) pending approval.`,
        link: '/time-off/requests',
      });
    }

    // 3. Expiring contracts (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringContracts = await prisma.contract.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    });
    if (expiringContracts > 0) {
      alerts.push({
        type: 'EXPIRING_CONTRACTS',
        severity: 'WARNING',
        message: `${expiringContracts} contract(s) expiring within 30 days.`,
        link: '/contracts',
      });
    }

    // 4. Missing checkouts today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const missingCheckouts = await prisma.attendance.count({
      where: { date: today, status: 'MISSING_CHECKOUT' },
    });
    if (missingCheckouts > 0) {
      alerts.push({
        type: 'MISSING_CHECKOUT',
        severity: 'WARNING',
        message: `${missingCheckouts} employee(s) have missing checkout today.`,
        link: '/attendance',
      });
    }

    // 5. Anomalies from recent payruns
    const anomalies = await getDashboardAnomalies();
    for (const anomaly of anomalies.slice(0, 3)) {
      alerts.push({
        type: anomaly.type,
        severity: anomaly.severity,
        message: anomaly.message,
        link: anomaly.payrunId ? `/payroll/payruns/${anomaly.payrunId}` : null,
      });
    }

    return sendSuccess(res, alerts);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/payroll
const getPayrollReport = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, departmentId, status = 'PAID' } = req.query;

    const where = { status };
    if (periodStart) where.periodStart = { gte: new Date(periodStart) };
    if (periodEnd) where.periodEnd = { lte: new Date(periodEnd) };

    const payslips = await prisma.payslip.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            jobPosition: true, employeeType: true,
            department: { select: { id: true, name: true } },
          },
        },
        payrun: { select: { id: true, name: true, periodStart: true, periodEnd: true } },
        salaryStructure: { select: { id: true, name: true } },
      },
      orderBy: [{ periodStart: 'desc' }, { employee: { lastName: 'asc' } }],
    });

    // Filter by department if needed
    const filtered = departmentId
      ? payslips.filter((p) => p.employee.department?.id === departmentId)
      : payslips;

    const totals = filtered.reduce(
      (acc, p) => ({
        gross: acc.gross + p.grossSalary,
        deductions: acc.deductions + p.totalDeductions,
        net: acc.net + p.netSalary,
      }),
      { gross: 0, deductions: 0, net: 0 }
    );

    return sendSuccess(res, {
      payslips: filtered,
      totals: {
        gross: Math.round(totals.gross * 100) / 100,
        deductions: Math.round(totals.deductions * 100) / 100,
        net: Math.round(totals.net * 100) / 100,
        count: filtered.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/attendance
const getAttendanceReport = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, departmentId, employeeId } = req.query;

    const where = {};
    if (periodStart || periodEnd) {
      where.date = {};
      if (periodStart) where.date.gte = new Date(periodStart);
      if (periodEnd) where.date.lte = new Date(periodEnd);
    }
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'desc' }],
    });

    // Group by employee
    const byEmployee = {};
    for (const r of records) {
      const key = r.employeeId;
      if (!byEmployee[key]) {
        byEmployee[key] = {
          employee: r.employee,
          present: 0, late: 0, absent: 0, overtime: 0,
          missing_checkout: 0, manual_correction: 0, total: 0,
          totalWorkedHours: 0,
        };
      }
      const s = r.status.toLowerCase().replace('_', '_');
      byEmployee[key][s] = (byEmployee[key][s] || 0) + 1;
      byEmployee[key].total++;
      if (r.workedHours) byEmployee[key].totalWorkedHours += r.workedHours;
    }

    return sendSuccess(res, {
      records,
      summary: Object.values(byEmployee),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/time-off
const getTimeOffReport = async (req, res, next) => {
  try {
    const { periodStart, periodEnd, status, timeOffTypeId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (timeOffTypeId) where.timeOffTypeId = timeOffTypeId;
    if (periodStart || periodEnd) {
      where.startDate = {};
      if (periodStart) where.startDate.gte = new Date(periodStart);
      if (periodEnd) where.startDate.lte = new Date(periodEnd);
    }

    const requests = await prisma.timeOffRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true, firstName: true, lastName: true, employeeCode: true,
            department: { select: { name: true } },
          },
        },
        timeOffType: { select: { id: true, name: true, unit: true, color: true } },
      },
      orderBy: { startDate: 'desc' },
    });

    const totalDays = requests
      .filter((r) => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.duration, 0);

    return sendSuccess(res, { requests, totalApprovedDays: totalDays });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummary,
  getPayrollTrend,
  getSalaryByDepartment,
  getAttendanceSummary,
  getTimeOffSummary,
  getAlerts,
  getPayrollReport,
  getAttendanceReport,
  getTimeOffReport,
};
