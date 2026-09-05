/**
 * Payroll Anomaly Detection Service
 *
 * Rule-based anomaly detection for payroll data.
 * No external AI. Uses real database records and configurable thresholds.
 */

const prisma = require('../config/prisma');

const ANOMALY_THRESHOLDS = {
  SALARY_JUMP_PERCENT: 20,    // Alert if net salary changes > 20%
  MAX_OVERTIME_HOURS: 60,     // Alert if overtime hours exceed 60/month
  MAX_DEDUCTION_CHANGE_PERCENT: 30, // Alert if deductions change > 30%
};

/**
 * Detect anomalies for a given payrun.
 *
 * @param {string} payrunId
 * @returns {Promise<Array<{severity, type, employeeId, employeeName, message, metadata}>>}
 */
async function detectAnomalies(payrunId) {
  const anomalies = [];

  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      payslips: {
        include: {
          employee: {
            select: {
              id: true, firstName: true, lastName: true, employeeCode: true,
            },
          },
          lines: true,
        },
      },
    },
  });

  if (!payrun) return anomalies;

  const periodStart = new Date(payrun.periodStart);

  for (const payslip of payrun.payslips) {
    const employee = payslip.employee;
    const empName = `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`;

    // --------------------------------------------------------
    // 1. Salary Jump Detection
    // Compare current net with most recent previous paid payslip
    // --------------------------------------------------------
    const previousPayslip = await prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        status: 'PAID',
        periodStart: { lt: periodStart },
        NOT: { id: payslip.id },
      },
      orderBy: { periodStart: 'desc' },
    });

    if (previousPayslip && previousPayslip.netSalary > 0) {
      const changePercent =
        ((payslip.netSalary - previousPayslip.netSalary) / previousPayslip.netSalary) * 100;

      if (Math.abs(changePercent) > ANOMALY_THRESHOLDS.SALARY_JUMP_PERCENT) {
        const direction = changePercent > 0 ? 'increase' : 'decrease';
        anomalies.push({
          severity: Math.abs(changePercent) > 50 ? 'ERROR' : 'WARNING',
          type: 'SALARY_ANOMALY',
          employeeId: employee.id,
          employeeName: empName,
          message: `${empName}: Net salary ${direction} of ${Math.abs(changePercent).toFixed(1)}% vs previous payroll (₹${previousPayslip.netSalary.toLocaleString('en-IN')} → ₹${payslip.netSalary.toLocaleString('en-IN')}).`,
          metadata: {
            previousNet: previousPayslip.netSalary,
            currentNet: payslip.netSalary,
            changePercent: Math.round(changePercent * 10) / 10,
          },
        });
      }

      // 2. Deduction change
      if (previousPayslip.totalDeductions > 0) {
        const deductionChange =
          ((payslip.totalDeductions - previousPayslip.totalDeductions) / previousPayslip.totalDeductions) * 100;

        if (Math.abs(deductionChange) > ANOMALY_THRESHOLDS.MAX_DEDUCTION_CHANGE_PERCENT) {
          anomalies.push({
            severity: 'WARNING',
            type: 'DEDUCTION_ANOMALY',
            employeeId: employee.id,
            employeeName: empName,
            message: `${empName}: Total deductions changed by ${Math.abs(deductionChange).toFixed(1)}% (₹${previousPayslip.totalDeductions.toLocaleString('en-IN')} → ₹${payslip.totalDeductions.toLocaleString('en-IN')}).`,
            metadata: {
              previousDeductions: previousPayslip.totalDeductions,
              currentDeductions: payslip.totalDeductions,
              changePercent: Math.round(deductionChange * 10) / 10,
            },
          });
        }
      }
    }

    // --------------------------------------------------------
    // 3. High Overtime
    // --------------------------------------------------------
    if (payslip.overtimeHours > ANOMALY_THRESHOLDS.MAX_OVERTIME_HOURS) {
      anomalies.push({
        severity: 'WARNING',
        type: 'HIGH_OVERTIME',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Unusually high overtime of ${payslip.overtimeHours} hours this period.`,
        metadata: { overtimeHours: payslip.overtimeHours },
      });
    }

    // --------------------------------------------------------
    // 4. Zero/negative net salary
    // --------------------------------------------------------
    if (payslip.netSalary <= 0) {
      anomalies.push({
        severity: 'ERROR',
        type: 'ZERO_NET_SALARY',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Net salary is ₹${payslip.netSalary}. This is critically invalid.`,
        metadata: { netSalary: payslip.netSalary },
      });
    }

    // --------------------------------------------------------
    // 5. Duplicate payslip (same period, another payrun)
    // --------------------------------------------------------
    const duplicate = await prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        periodStart: payrun.periodStart,
        periodEnd: payrun.periodEnd,
        status: { in: ['PAID'] },
        NOT: { payrunId },
      },
    });

    if (duplicate) {
      anomalies.push({
        severity: 'ERROR',
        type: 'DUPLICATE_PAYSLIP',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Already has a PAID payslip for this period in another payrun.`,
      });
    }
  }

  return anomalies;
}

/**
 * Detect anomalies across all recent payruns for dashboard alerts.
 */
async function getDashboardAnomalies() {
  const recentPayruns = await prisma.payrun.findMany({
    where: { status: { in: ['COMPUTED', 'VALIDATED'] } },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  const allAnomalies = [];
  for (const payrun of recentPayruns) {
    const anomalies = await detectAnomalies(payrun.id);
    allAnomalies.push(...anomalies.map((a) => ({ ...a, payrunId: payrun.id, payrunName: payrun.name })));
  }

  return allAnomalies;
}

module.exports = { detectAnomalies, getDashboardAnomalies, ANOMALY_THRESHOLDS };
