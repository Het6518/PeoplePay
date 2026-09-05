const prisma = require('../config/prisma');

/**
 * Get active Working Days Policy for a given period (e.g. "2026-09") or default global policy
 */
async function getWorkingDaysPolicy(effectivePeriod = null) {
  if (effectivePeriod) {
    const periodPolicy = await prisma.workingDaysPolicy.findFirst({
      where: { effectivePeriod },
    });
    if (periodPolicy) return periodPolicy;
  }

  const globalPolicy = await prisma.workingDaysPolicy.findFirst({
    where: { effectivePeriod: null },
    orderBy: { createdAt: 'desc' },
  });

  if (globalPolicy) return globalPolicy;

  // Fallback default
  return {
    id: 'default',
    name: 'Standard Monthly Policy',
    totalDays: 22,
    effectivePeriod: null,
  };
}

/**
 * Create or update Working Days Policy
 */
async function updateWorkingDaysPolicy({ totalDays, effectivePeriod = null, name = 'Standard Monthly Policy' }) {
  const parsedDays = parseInt(totalDays, 10);
  if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 31) {
    throw new Error('Working days must be a number between 1 and 31');
  }

  const existing = await prisma.workingDaysPolicy.findFirst({
    where: { effectivePeriod },
  });

  let policy;
  if (existing) {
    policy = await prisma.workingDaysPolicy.update({
      where: { id: existing.id },
      data: { totalDays: parsedDays, name },
    });
  } else {
    policy = await prisma.workingDaysPolicy.create({
      data: { totalDays: parsedDays, name, effectivePeriod },
    });
  }

  return policy;
}

/**
 * Calculate effective total working days for a payroll period
 * Base Policy Days - Paid Weekday Holidays
 */
async function calculatePeriodWorkingDays(periodStart, periodEnd) {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // Derive period string e.g. "2026-09"
  const periodStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const policy = await getWorkingDaysPolicy(periodStr);
  const baseWorkingDays = policy.totalDays;

  // Fetch approved paid company holidays in period
  const holidays = await prisma.companyHoliday.findMany({
    where: {
      isPaid: true,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Filter out weekend holidays (Sat = 6, Sun = 0) so we don't double deduct
  const weekdayHolidays = holidays.filter(h => {
    const day = new Date(h.date).getDay();
    return day !== 0 && day !== 6;
  });

  const paidHolidaysCount = weekdayHolidays.length;
  const effectiveWorkingDays = Math.max(1, baseWorkingDays - paidHolidaysCount);

  return {
    policyName: policy.name,
    baseWorkingDays,
    paidHolidaysCount,
    effectiveWorkingDays,
    weekdayHolidays,
  };
}

/**
 * Automatically recompute DRAFT and COMPUTED payruns affected by policy or holiday changes
 */
async function recomputeAffectedDraftPayruns(startDate, endDate) {
  const payrollEngine = require('./payrollEngine');

  const affectedPayruns = await prisma.payrun.findMany({
    where: {
      status: { in: ['DRAFT', 'COMPUTED'] },
      periodStart: { lte: new Date(endDate) },
      periodEnd: { gte: new Date(startDate) },
    },
  });

  const results = [];
  for (const payrun of affectedPayruns) {
    try {
      const updatedPayrun = await payrollEngine.computePayrun(payrun.id);
      results.push({ payrunId: payrun.id, name: payrun.name, status: 'RECOMPUTED' });
    } catch (err) {
      results.push({ payrunId: payrun.id, name: payrun.name, status: 'ERROR', error: err.message });
    }
  }

  // Also flag VALIDATED or PAID payruns for audit warning
  const finalizedPayruns = await prisma.payrun.findMany({
    where: {
      status: { in: ['VALIDATED', 'PAID'] },
      periodStart: { lte: new Date(endDate) },
      periodEnd: { gte: new Date(startDate) },
    },
  });

  for (const payrun of finalizedPayruns) {
    await prisma.payrun.update({
      where: { id: payrun.id },
      data: {
        notes: (payrun.notes || '') + '\n[AUDIT WARNING]: Working days policy or approved holidays modified after validation.',
      },
    });
  }

  return { recomputed: results, flaggedFinalizedCount: finalizedPayruns.length };
}

module.exports = {
  getWorkingDaysPolicy,
  updateWorkingDaysPolicy,
  calculatePeriodWorkingDays,
  recomputeAffectedDraftPayruns,
};
