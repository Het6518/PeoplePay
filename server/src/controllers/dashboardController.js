const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');
const { getDashboardAnomalies } = require('../services/payrollAnomaly');
const { logAuditAction } = require('../utils/auditLogger');

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
      employeeTypes,
      myAttendanceHistory,
      teamAttendanceList,
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

      // Today's attendance (with fallback to latest attendance date)
      (async () => {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        let records = await prisma.attendance.groupBy({
          by: ['status'],
          where: { date: { gte: start, lte: end } },
          _count: true,
        });

        if (!records || records.length === 0) {
          const latestRecord = await prisma.attendance.findFirst({
            orderBy: { date: 'desc' },
            select: { date: true },
          });
          if (latestRecord && latestRecord.date) {
            const lDate = new Date(latestRecord.date);
            const lStart = new Date(lDate.getFullYear(), lDate.getMonth(), lDate.getDate(), 0, 0, 0, 0);
            const lEnd = new Date(lDate.getFullYear(), lDate.getMonth(), lDate.getDate(), 23, 59, 59, 999);
            records = await prisma.attendance.groupBy({
              by: ['status'],
              where: { date: { gte: lStart, lte: lEnd } },
              _count: true,
            });
          }
        }
        return records || [];
      })(),

      prisma.employee.groupBy({
        by: ['employeeType'],
        where: { status: 'ACTIVE' },
        _count: true,
      }),

      // 28-Day Personal Attendance History for logged-in user
      (async () => {
        const empId = req.user?.employeeId || (await prisma.employee.findFirst({ select: { id: true } }))?.id;
        if (!empId) return [];

        const d28Ago = new Date();
        d28Ago.setDate(d28Ago.getDate() - 27);
        d28Ago.setHours(0, 0, 0, 0);

        const pastRecords = await prisma.attendance.findMany({
          where: {
            employeeId: empId,
            date: { gte: d28Ago },
          },
          select: { date: true, status: true, checkIn: true, checkOut: true },
          orderBy: { date: 'asc' },
        });

        const dateMap = {};
        for (const r of pastRecords) {
          const dateStr = new Date(r.date).toISOString().split('T')[0];
          dateMap[dateStr] = r.status;
        }

        const history = [];
        for (let i = 27; i >= 0; i--) {
          const day = new Date();
          day.setDate(day.getDate() - i);
          const dateStr = day.toISOString().split('T')[0];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const status = dateMap[dateStr] || (isWeekend ? 'WEEKEND' : 'OFF');

          history.push({
            date: dateStr,
            dayNum: day.getDate(),
            dayName: day.toLocaleDateString('en-US', { weekday: 'short' }),
            status,
          });
        }
        return history;
      })(),

      // Real active employees with current shift attendance status
      (async () => {
        const d = new Date();
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        
        let tStart = start;
        let tEnd = end;

        const hasToday = await prisma.attendance.findFirst({
          where: { date: { gte: start, lte: end } },
          select: { id: true },
        });

        if (!hasToday) {
          const latest = await prisma.attendance.findFirst({
            orderBy: { date: 'desc' },
            select: { date: true },
          });
          if (latest && latest.date) {
            const lDate = new Date(latest.date);
            tStart = new Date(lDate.getFullYear(), lDate.getMonth(), lDate.getDate(), 0, 0, 0, 0);
            tEnd = new Date(lDate.getFullYear(), lDate.getMonth(), lDate.getDate(), 23, 59, 59, 999);
          }
        }

        const emps = await prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            department: { select: { name: true } },
            attendance: {
              where: { date: { gte: tStart, lte: tEnd } },
              select: { status: true, checkIn: true },
            },
          },
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
          take: 28,
        });

        return emps.map((emp) => {
          const att = emp.attendance[0];
          return {
            id: emp.id,
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            code: emp.employeeCode,
            department: emp.department?.name || 'General',
            status: att ? att.status : 'OFF',
            checkIn: att?.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          };
        });
      })(),
    ]);

    const totalNetPaid = payslipAgg._sum.netSalary || 0;
    const avgSalary = payslipAgg._avg.netSalary || 0;

    // Attendance breakdown
    const onTimeCount = attendanceToday
      .filter((a) => ['PRESENT', 'OVERTIME', 'MANUAL_CORRECTION'].includes(a.status))
      .reduce((sum, a) => sum + a._count, 0);

    const lateCount = attendanceToday
      .filter((a) => a.status === 'LATE')
      .reduce((sum, a) => sum + a._count, 0);

    const absentCount = attendanceToday
      .filter((a) => a.status === 'ABSENT')
      .reduce((sum, a) => sum + a._count, 0);

    const totalPresent = onTimeCount + lateCount;
    const attendanceHealth = totalEmployees > 0 ? Math.round((totalPresent / totalEmployees) * 100) : 0;

    const fullTimeCount = employeeTypes.find((e) => e.employeeType === 'FULL_TIME')?._count || 0;
    const partTimeCount = employeeTypes.find((e) => e.employeeType === 'PART_TIME')?._count || 0;
    const contractCount = employeeTypes.find((e) => e.employeeType === 'CONTRACT')?._count || 0;

    return sendSuccess(res, {
      totalEmployees,
      activeContracts,
      totalNetPaid: Math.round(totalNetPaid * 100) / 100,
      payslipsGenerated: payslipCount,
      averageSalary: Math.round(avgSalary * 100) / 100,
      pendingLeaveRequests: pendingLeave,
      attendanceHealth,
      presentToday: totalPresent,
      onTimeToday: onTimeCount,
      lateToday: lateCount,
      absentToday: absentCount,
      fullTimeCount,
      partTimeCount,
      contractCount,
      myAttendanceHistory: myAttendanceHistory || [],
      teamAttendanceList: teamAttendanceList || [],
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

// GET /api/dashboard/admin
const getAdminDashboard = async (req, res, next) => {
  try {
    const [
      totalEmployees,
      employeesByStatus,
      totalContracts,
      expiringContracts,
      totalDepartments,
      usersByRole,
      recentUsers,
      auditLogs,
      employeesWithNoContract,
      contractsWithNoStructure,
      overlappingContracts,
      companyPayrollSummary,
    ] = await Promise.all([
      prisma.employee.count({ where: { status: 'ACTIVE' } }),

      prisma.employee.groupBy({
        by: ['status'],
        _count: true,
      }),

      prisma.contract.count({ where: { status: 'ACTIVE' } }),

      prisma.contract.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      prisma.department.count(),

      prisma.user.groupBy({
        by: ['role'],
        _count: true,
      }),

      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          employee: {
            select: { firstName: true, lastName: true, employeeCode: true },
          },
        },
      }),

      prisma.auditLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),

      // Integrity Alert 1: Active employees without active contract
      prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          contracts: { none: { status: 'ACTIVE' } },
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          email: true,
          department: { select: { name: true } },
        },
        take: 10,
      }),

      // Integrity Alert 2: Active contracts without salary structure
      prisma.contract.findMany({
        where: {
          status: 'ACTIVE',
          salaryStructureId: null,
        },
        select: {
          id: true,
          position: true,
          wage: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true },
          },
        },
        take: 10,
      }),

      // Integrity Alert 3: Overlapping active contracts for same employee
      prisma.contract.groupBy({
        by: ['employeeId'],
        where: { status: 'ACTIVE' },
        _count: true,
        having: { employeeId: { _count: { gt: 1 } } },
      }),

      // Company-wide aggregate payroll
      prisma.payslip.aggregate({
        where: { status: 'PAID' },
        _sum: { netSalary: true, grossSalary: true, totalDeductions: true },
        _count: true,
      }),
    ]);

    const roleBreakdown = {
      ADMIN: 0,
      HR_PAYROLL_MANAGER: 0,
      HR_PAYROLL_USER: 0,
      HR_MANAGER: 0,
      EMPLOYEE: 0,
    };
    for (const r of usersByRole) {
      roleBreakdown[r.role] = r._count;
    }

    const dataIntegrityAlerts = [];
    if (employeesWithNoContract.length > 0) {
      dataIntegrityAlerts.push({
        id: 'no-active-contract',
        type: 'NO_CONTRACT',
        severity: 'HIGH',
        title: `${employeesWithNoContract.length} Active Employees Lack Active Contracts`,
        description: 'Employees with no active contract cannot be processed in automated payruns.',
        affectedCount: employeesWithNoContract.length,
        items: employeesWithNoContract,
        link: '/contracts',
      });
    }

    if (contractsWithNoStructure.length > 0) {
      dataIntegrityAlerts.push({
        id: 'no-salary-structure',
        type: 'NO_STRUCTURE',
        severity: 'HIGH',
        title: `${contractsWithNoStructure.length} Active Contracts Lack Salary Structure`,
        description: 'Contracts missing a salary structure will default to contract wage or require manual assignment.',
        affectedCount: contractsWithNoStructure.length,
        items: contractsWithNoStructure,
        link: '/contracts',
      });
    }

    if (overlappingContracts.length > 0) {
      dataIntegrityAlerts.push({
        id: 'overlapping-contracts',
        type: 'OVERLAPPING_CONTRACTS',
        severity: 'CRITICAL',
        title: `${overlappingContracts.length} Employees Have Overlapping Active Contracts`,
        description: 'Multiple active contracts for a single employee create wage computation conflicts.',
        affectedCount: overlappingContracts.length,
        items: overlappingContracts,
        link: '/contracts',
      });
    }

    return sendSuccess(res, {
      kpis: {
        totalEmployees,
        totalContracts,
        expiringContracts,
        totalDepartments,
        totalUsers: recentUsers.length,
        usersByRole: roleBreakdown,
      },
      recentUsers,
      auditLogs,
      dataIntegrityAlerts,
      companyPayrollSummary: {
        totalNetPaid: Math.round((companyPayrollSummary._sum.netSalary || 0) * 100) / 100,
        totalGross: Math.round((companyPayrollSummary._sum.grossSalary || 0) * 100) / 100,
        totalDeductions: Math.round((companyPayrollSummary._sum.totalDeductions || 0) * 100) / 100,
        totalPayslips: companyPayrollSummary._count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/payroll-manager
const getPayrollManagerDashboard = async (req, res, next) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const [
      payruns,
      payslipsWithWarnings,
      payslipAgg,
      approvedTimeOff,
      totalEmployees,
      attendanceToday,
      structureChangeLogs,
      pendingSuggestions,
    ] = await Promise.all([
      // Payruns pipeline
      prisma.payrun.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          salaryStructure: { select: { name: true } },
          _count: { select: { payslips: true } },
        },
      }),

      // Payslips with warnings/errors
      prisma.payslip.findMany({
        where: {
          OR: [{ hasWarnings: true }, { hasErrors: true }],
          payrun: { status: { in: ['DRAFT', 'COMPUTED', 'VALIDATED'] } },
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          payrun: { select: { id: true, name: true, status: true } },
        },
        take: 15,
      }),

      // Aggregate paid payslips
      prisma.payslip.aggregate({
        where: { status: 'PAID' },
        _sum: { netSalary: true },
        _avg: { netSalary: true },
        _count: true,
      }),

      // Approved time off duration
      prisma.timeOffRequest.aggregate({
        where: { status: 'APPROVED' },
        _sum: { duration: true },
      }),

      prisma.employee.count({ where: { status: 'ACTIVE' } }),

      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
        _count: true,
      }),

      // Salary structure & rule change log from AuditLog
      prisma.auditLog.findMany({
        where: {
          entityType: { in: ['SALARY_STRUCTURE', 'SALARY_RULE'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // Pending holiday suggestions
      prisma.holidaySuggestion.findMany({
        where: { status: 'PENDING' },
        orderBy: { date: 'asc' },
        take: 10,
      }),
    ]);

    // Group payruns by status and flag stuck payruns (>3 days in DRAFT/COMPUTED/VALIDATED)
    const pipeline = {
      DRAFT: [],
      COMPUTED: [],
      VALIDATED: [],
      PAID: [],
    };

    for (const pr of payruns) {
      const isStuck =
        ['DRAFT', 'COMPUTED', 'VALIDATED'].includes(pr.status) &&
        new Date(pr.updatedAt || pr.createdAt) < threeDaysAgo;

      const item = {
        id: pr.id,
        name: pr.name,
        periodStart: pr.periodStart,
        periodEnd: pr.periodEnd,
        salaryStructure: pr.salaryStructure?.name,
        employeeCount: pr._count.payslips,
        totalNet: pr.totalNet,
        status: pr.status,
        updatedAt: pr.updatedAt,
        isStuck,
      };

      if (pipeline[pr.status]) {
        pipeline[pr.status].push(item);
      }
    }

    const presentCount = attendanceToday
      .filter((a) => ['PRESENT', 'OVERTIME', 'MANUAL_CORRECTION', 'LATE'].includes(a.status))
      .reduce((sum, a) => sum + a._count, 0);
    const attendanceHealth = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    return sendSuccess(res, {
      kpis: {
        totalNetPaid: Math.round((payslipAgg._sum.netSalary || 0) * 100) / 100,
        payslipsGenerated: payslipAgg._count || 0,
        averageSalary: Math.round((payslipAgg._avg.netSalary || 0) * 100) / 100,
        approvedTimeOffDays: approvedTimeOff._sum.duration || 0,
        attendanceHealth,
      },
      payrunPipeline: pipeline,
      pendingActionsQueue: payslipsWithWarnings,
      structureChangeLogs,
      pendingHolidaySuggestions: pendingSuggestions,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/payroll-user
const getPayrollUserDashboard = async (req, res, next) => {
  try {
    const [
      inProgressPayruns,
      payslipWarnings,
      activeStructures,
      payslipAgg,
      totalEmployees,
      attendanceToday,
      pendingLeaves,
    ] = await Promise.all([
      // In-progress payruns (DRAFT or COMPUTED)
      prisma.payrun.findMany({
        where: { status: { in: ['DRAFT', 'COMPUTED'] } },
        orderBy: { createdAt: 'desc' },
        include: {
          salaryStructure: { select: { name: true } },
          _count: { select: { payslips: true } },
        },
      }),

      // Payslip warnings
      prisma.payslip.findMany({
        where: {
          hasWarnings: true,
          payrun: { status: { in: ['DRAFT', 'COMPUTED'] } },
        },
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          payrun: { select: { id: true, name: true } },
        },
        take: 10,
      }),

      // Read-Only active salary structures & rules
      prisma.salaryStructure.findMany({
        where: { isActive: true },
        include: {
          rules: {
            where: { isActive: true },
            orderBy: { sequence: 'asc' },
          },
        },
      }),

      prisma.payslip.aggregate({
        where: { status: 'PAID' },
        _sum: { netSalary: true },
        _count: true,
      }),

      prisma.employee.count({ where: { status: 'ACTIVE' } }),

      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _count: true,
      }),

      prisma.timeOffRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const presentCount = attendanceToday
      .filter((a) => ['PRESENT', 'OVERTIME', 'MANUAL_CORRECTION', 'LATE'].includes(a.status))
      .reduce((sum, a) => sum + a._count, 0);
    const attendanceHealth = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    return sendSuccess(res, {
      kpis: {
        totalNetPaid: Math.round((payslipAgg._sum.netSalary || 0) * 100) / 100,
        payslipsProcessed: payslipAgg._count || 0,
        attendanceHealth,
      },
      inProgressPayruns,
      payslipWarnings,
      salaryStructures: activeStructures,
      attendanceSnapshot: {
        totalEmployees,
        presentToday: presentCount,
        pendingLeaves,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/dashboard/flag-warning
const flagPayslipWarning = async (req, res, next) => {
  try {
    const { payslipId, note } = req.body;
    if (!payslipId) return sendError(res, 'payslipId is required', 400);

    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: { employee: true },
    });

    if (!payslip) return sendError(res, 'Payslip not found', 404);

    const existingNotes = Array.isArray(payslip.validationNotes) ? payslip.validationNotes : [];
    const updatedNotes = [
      ...existingNotes,
      {
        type: 'FLAGGED_FOR_MANAGER',
        severity: 'WARNING',
        message: note || 'Flagged by Payroll User for Payroll Manager review.',
        flaggedBy: req.user?.email || 'Payroll User',
        flaggedAt: new Date().toISOString(),
      },
    ];

    await prisma.payslip.update({
      where: { id: payslipId },
      data: {
        hasWarnings: true,
        validationNotes: updatedNotes,
      },
    });

    await logAuditAction({
      actionType: 'FLAG_PAYSLIP_WARNING',
      entityType: 'PAYSLIP',
      entityId: payslipId,
      description: `Flagged payslip for ${payslip.employee?.firstName} ${payslip.employee?.lastName}: ${note || 'Needs Manager review'}`,
      performedBy: req.user?.email || 'Payroll User',
    });

    return sendSuccess(res, { message: 'Payslip flagged for Payroll Manager review successfully.' });
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
  getAdminDashboard,
  getPayrollManagerDashboard,
  getPayrollUserDashboard,
  flagPayslipWarning,
};

