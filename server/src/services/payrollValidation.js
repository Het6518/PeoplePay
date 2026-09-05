/**
 * Payroll Validation Service
 *
 * Validates a payrun before marking it as PAID.
 * Returns structured validation issues with severity levels.
 */

const prisma = require('../config/prisma');
const { getApplicableContract } = require('./payrollEngine');

/**
 * @param {string} payrunId
 * @returns {Promise<Array<{severity, type, employeeId, employeeName, message, metadata}>>}
 */
async function validatePayrun(payrunId) {
  const issues = [];

  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
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
              bankAccountNumber: true, email: true,
            },
          },
          contract: true,
          lines: true,
        },
      },
    },
  });

  if (!payrun) {
    return [{ severity: 'ERROR', type: 'MISSING_PAYRUN', message: 'Payrun not found.', employeeId: null }];
  }

  const periodStart = new Date(payrun.periodStart);
  const periodEnd = new Date(payrun.periodEnd);

  // 1. Check salary structure has rules
  if (!payrun.salaryStructure || payrun.salaryStructure.rules.length === 0) {
    issues.push({
      severity: 'ERROR',
      type: 'MISSING_SALARY_RULES',
      employeeId: null,
      message: `Salary structure "${payrun.salaryStructure?.name || 'unknown'}" has no active rules.`,
    });
  }

  // 2. Check GROSS and NET rules exist
  const ruleCategories = payrun.salaryStructure?.rules.map((r) => r.category) || [];
  if (!ruleCategories.includes('NET')) {
    issues.push({
      severity: 'ERROR',
      type: 'MISSING_NET_RULE',
      employeeId: null,
      message: 'Salary structure has no NET rule. Net salary cannot be calculated.',
    });
  }

  if (!ruleCategories.includes('BASIC') && !ruleCategories.includes('GROSS')) {
    issues.push({
      severity: 'WARNING',
      type: 'MISSING_BASIC_RULE',
      employeeId: null,
      message: 'Salary structure has no BASIC or GROSS rule.',
    });
  }

  // 3. Check invalid dates
  if (periodStart >= periodEnd) {
    issues.push({
      severity: 'ERROR',
      type: 'INVALID_DATES',
      employeeId: null,
      message: 'Payrun period start date must be before end date.',
    });
  }

  // 4. Check no payslips (empty payrun)
  if (payrun.payslips.length === 0) {
    issues.push({
      severity: 'ERROR',
      type: 'NO_PAYSLIPS',
      employeeId: null,
      message: 'Payrun has no payslips. Please compute payroll first.',
    });
  }

  // Per-employee checks
  for (const payslip of payrun.payslips) {
    const employee = payslip.employee;
    const empName = `${employee.firstName} ${employee.lastName} (${employee.employeeCode})`;

    // 5. Missing applicable contract
    const { contract, error: contractError } = await getApplicableContract(
      employee.id,
      periodStart,
      periodEnd,
      prisma
    );

    if (contractError) {
      issues.push({
        severity: 'ERROR',
        type: 'MISSING_CONTRACT',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: ${contractError}`,
      });
    }

    // 6. Missing bank details
    if (!employee.bankAccountNumber || !employee.bankName) {
      issues.push({
        severity: 'WARNING',
        type: 'MISSING_BANK_DETAILS',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Missing bank account details. Electronic payment may fail.`,
      });
    }

    // 7. Missing email (for payslip delivery)
    if (!employee.email) {
      issues.push({
        severity: 'WARNING',
        type: 'MISSING_EMAIL',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: No email address. Cannot send payslip digitally.`,
      });
    }

    // 8. Invalid/zero/negative net salary
    if (payslip.netSalary <= 0) {
      issues.push({
        severity: 'ERROR',
        type: 'INVALID_NET_SALARY',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Net salary is ₹${payslip.netSalary}. This is invalid.`,
        metadata: { netSalary: payslip.netSalary },
      });
    }

    // 9. Gross < Deductions
    if (payslip.totalDeductions > payslip.grossSalary) {
      issues.push({
        severity: 'ERROR',
        type: 'DEDUCTIONS_EXCEED_GROSS',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Total deductions (₹${payslip.totalDeductions}) exceed gross salary (₹${payslip.grossSalary}).`,
        metadata: { gross: payslip.grossSalary, deductions: payslip.totalDeductions },
      });
    }

    // 10. Duplicate payslip check (same employee, same period, different payrun)
    const duplicate = await prisma.payslip.findFirst({
      where: {
        employeeId: employee.id,
        periodStart: payrun.periodStart,
        periodEnd: payrun.periodEnd,
        NOT: { payrunId: payrunId },
        status: { in: ['COMPUTED', 'VALIDATED', 'PAID'] },
      },
      include: { payrun: { select: { id: true, name: true } } },
    });

    if (duplicate) {
      issues.push({
        severity: 'ERROR',
        type: 'DUPLICATE_PAYSLIP',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Duplicate payslip detected in payrun "${duplicate.payrun.name}". This employee was already paid for this period.`,
        metadata: { duplicatePayrunId: duplicate.payrunId, duplicatePayrunName: duplicate.payrun.name },
      });
    }

    // 11. Zero worked days
    if (payslip.workedDays === 0) {
      issues.push({
        severity: 'WARNING',
        type: 'ZERO_WORKED_DAYS',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Has 0 worked days for this period. Is this expected?`,
      });
    }

    // 12. Missing payslip lines
    if (payslip.lines.length === 0) {
      issues.push({
        severity: 'ERROR',
        type: 'MISSING_PAYSLIP_LINES',
        employeeId: employee.id,
        employeeName: empName,
        message: `${empName}: Payslip has no lines. Please recompute payroll.`,
      });
    }
  }

  return issues;
}

module.exports = { validatePayrun };
