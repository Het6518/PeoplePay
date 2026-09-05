/**
 * PeoplePay360 Payroll Engine
 *
 * Implements the complete salary rule-based payroll calculation.
 * Salary rules are loaded from the database and executed sequentially.
 * All calculations happen on the backend. Never trust the frontend.
 *
 * Rule computation types:
 *   FIXED   → amount = rule.fixedAmount
 *   PERCENTAGE → amount = context[rule.percentageBase] * rule.percentage / 100
 *   FORMULA → amount = safeEval(rule.formula, context)
 */

const { create, all } = require('mathjs');

// Create a sandboxed mathjs instance with only safe operations
const math = create(all);
math.import(
  {
    // Disable unsafe functions
    import: function () { throw new Error('Disabled'); },
    createUnit: function () { throw new Error('Disabled'); },
    evaluate: math.evaluate,
    parse: math.parse,
  },
  { override: true }
);

/**
 * Safely evaluate a formula string using the calculation context.
 *
 * Available context variables match salary rule codes (e.g., BASIC, HRA, GROSS, PF, TAX).
 * Also available: CONTRACT_WAGE, WORKED_DAYS, TOTAL_DAYS, OVERTIME_HOURS, LEAVE_DAYS
 */
function safeEvaluateFormula(formula, context) {
  try {
    // Build a scope from the context
    const scope = { ...context };

    // Replace any unknown identifiers with 0 to prevent errors
    const result = math.evaluate(formula, scope);

    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error(`Formula "${formula}" did not produce a valid number.`);
    }

    return Math.max(0, Math.round(result * 100) / 100);
  } catch (err) {
    throw new Error(`Formula evaluation failed: "${formula}". ${err.message}`);
  }
}

/**
 * Find the applicable contract for an employee for a given payroll period.
 *
 * Rules:
 * - Contract date range must overlap with the payroll period
 * - Contract status must be ACTIVE (not DRAFT, EXPIRED, TERMINATED)
 * - If 0 applicable contracts: return error
 * - If >1 applicable contracts: return error (overlapping detected)
 *
 * @param {string} employeeId
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @param {PrismaClient} prisma
 */
async function getApplicableContract(employeeId, periodStart, periodEnd, prisma) {
  const contracts = await prisma.contract.findMany({
    where: {
      employeeId,
      status: { in: ['ACTIVE'] },
      startDate: { lte: periodEnd },
      OR: [
        { endDate: null },
        { endDate: { gte: periodStart } },
      ],
    },
    include: {
      salaryStructure: {
        include: {
          rules: {
            where: { isActive: true },
            orderBy: { sequence: 'asc' },
          },
        },
      },
    },
  });

  if (contracts.length === 0) {
    return {
      contract: null,
      error: `No active contract found for employee covering period ${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}.`,
    };
  }

  if (contracts.length > 1) {
    return {
      contract: null,
      error: `Multiple overlapping contracts found for employee (${contracts.length} contracts). Please resolve the conflict before processing payroll.`,
    };
  }

  return { contract: contracts[0], error: null };
}

/**
 * Calculate worked days from attendance records for a given period.
 *
 * @param {string} employeeId
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @param {PrismaClient} prisma
 * @returns {{ workedDays, totalWorkingDays, leaveDays, overtimeHours, attendanceSummary }}
 */
async function calculateAttendanceStats(employeeId, periodStart, periodEnd, prisma) {
  const attendance = await prisma.attendance.findMany({
    where: {
      employeeId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate dynamic total working days using Working Days Policy & approved paid holidays
  const workingDaysService = require('./workingDaysService');
  const periodDaysInfo = await workingDaysService.calculatePeriodWorkingDays(periodStart, periodEnd);
  let totalWorkingDays = periodDaysInfo.effectiveWorkingDays;

  // Check if employee joined mid-month or left mid-month for proportional adjustment
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { joiningDate: true },
  });

  if (employee && employee.joiningDate) {
    const joinDate = new Date(employee.joiningDate);
    if (joinDate > periodStart && joinDate <= periodEnd) {
      // Calculate Mon-Fri total in full period vs Mon-Fri total after joining
      let fullMonFri = 0;
      let afterJoinMonFri = 0;
      const cur = new Date(periodStart);
      while (cur <= periodEnd) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          fullMonFri++;
          if (cur >= joinDate) {
            afterJoinMonFri++;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
      if (fullMonFri > 0) {
        totalWorkingDays = Math.max(1, Math.round((periodDaysInfo.effectiveWorkingDays * afterJoinMonFri) / fullMonFri));
      }
    }
  }

  let workedDays = 0;
  let overtimeHours = 0;
  const summary = {
    present: 0,
    late: 0,
    absent: 0,
    overtime: 0,
    missing_checkout: 0,
    manual_correction: 0,
  };

  for (const record of attendance) {
    switch (record.status) {
      case 'PRESENT':
        workedDays += 1;
        summary.present++;
        break;
      case 'LATE':
        workedDays += 1;
        summary.late++;
        break;
      case 'OVERTIME':
        workedDays += 1;
        summary.overtime++;
        if (record.workedHours) overtimeHours += Math.max(0, record.workedHours - 8);
        break;
      case 'MANUAL_CORRECTION':
        workedDays += 1;
        summary.manual_correction++;
        break;
      case 'MISSING_CHECKOUT':
        workedDays += 0.5; // Partial day
        summary.missing_checkout++;
        break;
      case 'ABSENT':
        summary.absent++;
        break;
      default:
        break;
    }
  }

  // Get approved leave days
  const approvedLeave = await prisma.timeOffRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { lte: periodEnd },
      endDate: { gte: periodStart },
    },
    include: {
      timeOffType: { select: { id: true, name: true, isPaid: true } },
    },
  });

  let leaveDays = 0;
  for (const leave of approvedLeave) {
    // Check isPaid flag on TimeOffType configuration
    const isPaid = leave.timeOffType ? leave.timeOffType.isPaid !== false : true;
    if (!isPaid) continue;

    const overlapStart = new Date(Math.max(new Date(leave.startDate).getTime(), periodStart.getTime()));
    const overlapEnd = new Date(Math.min(new Date(leave.endDate).getTime(), periodEnd.getTime()));
    let overlappingWorkingDays = 0;
    const cursor = new Date(overlapStart);

    while (cursor <= overlapEnd) {
      const dayOfWeek = cursor.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) overlappingWorkingDays++;
      cursor.setDate(cursor.getDate() + 1);
    }

    leaveDays += Math.min(leave.duration, overlappingWorkingDays);
  }

  // Final worked days = attendance worked days + paid leave days
  const finalWorkedDays = Math.min(workedDays + leaveDays, totalWorkingDays);

  return {
    workedDays: Math.round(finalWorkedDays * 100) / 100,
    totalWorkingDays,
    leaveDays: Math.round(leaveDays * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    attendanceSummary: summary,
    attendanceRecords: attendance,
  };
}

/**
 * Core payroll calculation function.
 *
 * Processes salary rules in sequence, building up a calculation context.
 * Returns payslip lines and salary totals.
 *
 * @param {Object} params
 * @param {Object} params.contract - The applicable contract (including salary structure + rules)
 * @param {Object} params.attendanceStats - Output from calculateAttendanceStats
 * @param {Array} params.rules - Salary rules from employee's assigned salary structure
 * @returns {{ lines, grossSalary, totalDeductions, netSalary, context }}
 */
function processPayrollRules({ contract, attendanceStats, rules }) {
  const { workedDays, totalWorkingDays, overtimeHours, leaveDays } = attendanceStats;

  // Initial calculation context
  const context = {
    CONTRACT_WAGE: contract.wage || 0,
    WORKED_DAYS: workedDays,
    TOTAL_DAYS: totalWorkingDays,
    OVERTIME_HOURS: overtimeHours,
    LEAVE_DAYS: leaveDays,
    BASIC: 0,
    GROSS: 0,
    NET: 0,
  };

  const lines = [];
  let grossSalary = 0;
  let totalDeductions = 0;

  for (const rule of rules) {
    if (!rule.isActive) continue;

    let amount = 0;

    try {
      switch (rule.computationType) {
        case 'FIXED':
          amount = rule.fixedAmount || 0;

          if (rule.category === 'BASIC') {
            amount = totalWorkingDays > 0
              ? (contract.wage * workedDays) / totalWorkingDays
              : contract.wage;
          }
          // FIXED allowance/deduction rules (e.g. Medical Allowance) pay full flat amount decoupled from attendance
          amount = Math.round(amount * 100) / 100;
          break;

        case 'PERCENTAGE':
          const base = context[rule.percentageBase] || context[rule.code] || 0;
          amount = (base * (rule.percentage || 0)) / 100;
          amount = Math.round(amount * 100) / 100;
          break;

        case 'FORMULA':
          amount = safeEvaluateFormula(rule.formula, context);
          break;

        default:
          amount = 0;
      }
    } catch (err) {
      throw new Error(`Rule "${rule.name}" (${rule.code}): ${err.message}`);
    }

    // Store result in context under rule's code
    context[rule.code] = amount;

    // Accumulate based on category
    if (['BASIC', 'ALLOWANCE'].includes(rule.category)) {
      grossSalary += amount;
    } else if (rule.category === 'GROSS') {
      // GROSS rule resets gross to computed value
      grossSalary = amount;
      context.GROSS = amount;
    } else if (rule.category === 'DEDUCTION') {
      totalDeductions += amount;
    } else if (rule.category === 'NET') {
      context.NET = amount;
    }

    lines.push({
      salaryRuleId: rule.id,
      name: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      amount,
      quantity: 1,
      rate: amount,
    });
  }

  // Ensure GROSS is set
  if ((!context.GROSS || context.GROSS === 0) && grossSalary > 0) {
    context.GROSS = grossSalary;
  }

  // Final net salary
  const calculatedGross = context.GROSS || grossSalary || 0;
  const netSalary = context.NET || Math.max(0, calculatedGross - totalDeductions);

  return {
    lines,
    grossSalary: Math.round(calculatedGross * 100) / 100,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
    netSalary: Math.round(netSalary * 100) / 100,
    context,
  };
}

/**
 * Full payroll computation for a single employee in a payrun.
 */
async function computeEmployeePayroll({
  employee,
  payrun,
  salaryStructureId,
  rules,
  prisma,
}) {
  const periodStart = new Date(payrun.periodStart);
  const periodEnd = new Date(payrun.periodEnd);

  // Step 1: Find applicable contract
  const { contract, error: contractError } = await getApplicableContract(
    employee.id,
    periodStart,
    periodEnd,
    prisma
  );

  if (contractError) {
    return {
      success: false,
      employeeId: employee.id,
      error: contractError,
    };
  }

  // Use the employee contract's assigned Salary Structure and Rules if available
  const contractStructure = contract.salaryStructure;
  const effectiveStructureId = contractStructure?.id || salaryStructureId;
  const effectiveRules = (contractStructure?.rules && contractStructure.rules.length > 0)
    ? contractStructure.rules
    : rules;

  // Step 2: Calculate attendance stats
  const attendanceStats = await calculateAttendanceStats(
    employee.id,
    periodStart,
    periodEnd,
    prisma
  );

  // Step 3: Process salary rules STRICTLY for the employee's structure
  let calculation;
  try {
    calculation = processPayrollRules({
      contract,
      attendanceStats,
      rules: effectiveRules,
    });
  } catch (err) {
    return {
      success: false,
      employeeId: employee.id,
      error: err.message,
    };
  }

  // Step 4: Validate result
  if (calculation.netSalary < 0) {
    return {
      success: false,
      employeeId: employee.id,
      error: `Computed net salary is negative (₹${calculation.netSalary}). Please review salary rules.`,
    };
  }

  return {
    success: true,
    employeeId: employee.id,
    contractId: contract.id,
    salaryStructureId: effectiveStructureId,
    workedDays: attendanceStats.workedDays,
    totalWorkingDays: attendanceStats.totalWorkingDays,
    leaveDays: attendanceStats.leaveDays,
    overtimeHours: attendanceStats.overtimeHours,
    grossSalary: calculation.grossSalary,
    totalDeductions: calculation.totalDeductions,
    netSalary: calculation.netSalary,
    lines: calculation.lines,
    attendanceSummary: attendanceStats.attendanceSummary,
  };
}

module.exports = {
  getApplicableContract,
  calculateAttendanceStats,
  processPayrollRules,
  computeEmployeePayroll,
  safeEvaluateFormula,
};
