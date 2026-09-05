/**
 * PeoplePay360 Overtime Service
 *
 * Implements complete overtime calculation, approval workflows,
 * attendance auto-synchronization, and payroll engine integration.
 */

const defaultPrisma = require('../config/prisma');

/**
 * Calculate expected daily working hours from working schedule day.
 *
 * @param {Object} scheduleDay - WorkingScheduleDay record
 * @returns {number} Expected hours in decimal (e.g. 8.0)
 */
function getExpectedHoursForDay(scheduleDay) {
  if (!scheduleDay || !scheduleDay.isWorkday || !scheduleDay.startTime || !scheduleDay.endTime) {
    return 0; // Off-day / non-working day
  }

  const [startH, startM] = scheduleDay.startTime.split(':').map(Number);
  const [endH, endM] = scheduleDay.endTime.split(':').map(Number);

  const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  const breakMinutes = scheduleDay.breakMinutes || 0;
  const netMinutes = Math.max(0, totalMinutes - breakMinutes);

  return Math.round((netMinutes / 60) * 100) / 100;
}

/**
 * Determine the multiplier for a given date based on schedule and holidays.
 *
 * @param {Date} date - Attendance date
 * @param {Object} schedule - WorkingSchedule with days and multipliers
 * @param {boolean} isCompanyHoliday - Whether the date is an approved company holiday
 * @returns {{ multiplier: number, type: 'HOLIDAY' | 'WEEKEND' | 'NORMAL' }}
 */
function getMultiplierForDate(date, schedule, isCompanyHoliday = false) {
  const normMultiplier = schedule?.overtimeMultiplier ?? 1.5;
  const weekendMultiplier = schedule?.weekendOvertimeMultiplier ?? 2.0;
  const holidayMultiplier = schedule?.holidayOvertimeMultiplier ?? 2.0;

  if (isCompanyHoliday) {
    return { multiplier: holidayMultiplier, type: 'HOLIDAY' };
  }

  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
  const scheduleDay = schedule?.days?.find((sd) => sd.dayOfWeek === dayOfWeek);

  const isWeekendOrOffDay = dayOfWeek === 0 || dayOfWeek === 6 || (scheduleDay && !scheduleDay.isWorkday);

  if (isWeekendOrOffDay) {
    return { multiplier: weekendMultiplier, type: 'WEEKEND' };
  }

  return { multiplier: normMultiplier, type: 'NORMAL' };
}

/**
 * Calculate hourly rate from monthly contract wage and working schedule.
 *
 * Standard formula: wage / monthlyConfiguredHours
 * monthlyConfiguredHours = (weeklyHours * 52) / 12 (default: 40h/week -> 173.33h/month)
 *
 * @param {number} wage - Monthly base contract wage
 * @param {number} weeklyHours - Weekly configured hours (e.g. 40)
 * @returns {number} Base hourly rate
 */
function calculateHourlyRate(wage, weeklyHours = 40) {
  if (!wage || wage <= 0) return 0;
  const effectiveWeekly = weeklyHours > 0 ? weeklyHours : 40;
  const monthlyHours = (effectiveWeekly * 52) / 12;
  return Math.round((wage / monthlyHours) * 100) / 100;
}

/**
 * Calculate overtime hours, rate, and amount for an attendance entry.
 *
 * @param {Object} params
 * @param {number} params.actualWorkedHours - Actual hours worked from attendance
 * @param {Object} params.schedule - Employee's WorkingSchedule with days
 * @param {Object} params.contract - Employee's active Contract
 * @param {Date} params.date - Attendance date
 * @param {boolean} params.isHoliday - Whether the date is a holiday
 * @param {string} params.attendanceStatus - Attendance status (PRESENT, LATE, etc.)
 * @returns {Object} Overtime computation details
 */
function calculateDailyOvertime({
  actualWorkedHours,
  schedule,
  contract,
  date,
  isHoliday = false,
  attendanceStatus = 'PRESENT',
}) {
  // Missing checkout or unworked status does not generate overtime
  if (
    actualWorkedHours === null ||
    actualWorkedHours === undefined ||
    actualWorkedHours <= 0 ||
    attendanceStatus === 'MISSING_CHECKOUT' ||
    attendanceStatus === 'ABSENT'
  ) {
    return {
      expectedHours: 0,
      actualHours: 0,
      overtimeHours: 0,
      hourlyRate: 0,
      multiplier: 1.5,
      overtimeRate: 0,
      overtimeAmount: 0,
      eligible: false,
    };
  }

  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const scheduleDay = schedule?.days?.find((sd) => sd.dayOfWeek === dayOfWeek);

  const expectedHours = getExpectedHoursForDay(scheduleDay);

  // Overtime Hours formula: max(0, actualWorkedHours - expectedWorkedHours)
  // On a non-working day / weekend where expected is 0, all worked hours count as overtime
  const rawOvertimeHours = Math.max(0, actualWorkedHours - expectedHours);
  const overtimeHours = Math.round(rawOvertimeHours * 100) / 100;

  if (overtimeHours <= 0) {
    return {
      expectedHours,
      actualHours: actualWorkedHours,
      overtimeHours: 0,
      hourlyRate: 0,
      multiplier: 1.5,
      overtimeRate: 0,
      overtimeAmount: 0,
      eligible: false,
    };
  }

  const weeklyHours = schedule?.weeklyHours || 40;
  const wage = contract?.wage || 0;
  const hourlyRate = calculateHourlyRate(wage, weeklyHours);
  const { multiplier, type } = getMultiplierForDate(date, schedule, isHoliday);
  const overtimeRate = Math.round(hourlyRate * multiplier * 100) / 100;
  const overtimeAmount = Math.round(overtimeHours * overtimeRate * 100) / 100;

  return {
    expectedHours,
    actualHours: actualWorkedHours,
    overtimeHours,
    hourlyRate,
    multiplier,
    overtimeRate,
    overtimeAmount,
    overtimeType: type,
    eligible: true,
  };
}

/**
 * Synchronize overtime record for a specific attendance record.
 * Called automatically upon check-out, attendance creation, or correction.
 *
 * @param {string} attendanceId - ID of the attendance record
 * @param {Object} [client] - Optional Prisma client / transaction
 */
async function syncAttendanceOvertime(attendanceId, client = defaultPrisma) {
  const attendance = await client.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      employee: {
        include: {
          workingSchedule: { include: { days: true } },
          contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      },
    },
  });

  if (!attendance || !attendance.employee) return null;

  const employee = attendance.employee;
  const schedule = employee.workingSchedule;
  const contract = employee.contracts?.[0];

  // Check if date is an approved company holiday
  const dateObj = new Date(attendance.date);
  const startOfDay = new Date(dateObj);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(dateObj);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const holiday = await client.companyHoliday.findFirst({
    where: {
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  const isHoliday = !!holiday;

  const otCalc = calculateDailyOvertime({
    actualWorkedHours: attendance.workedHours,
    schedule,
    contract,
    date: attendance.date,
    isHoliday,
    attendanceStatus: attendance.status,
  });

  const existingOt = await client.overtime.findUnique({
    where: { attendanceId },
  });

  if (!otCalc.eligible || otCalc.overtimeHours <= 0) {
    if (existingOt) {
      // If already approved, do not silently delete without record; update to 0 or cancel
      if (existingOt.status === 'PENDING') {
        await client.overtime.delete({ where: { id: existingOt.id } });
      } else {
        await client.overtime.update({
          where: { id: existingOt.id },
          data: {
            actualHours: attendance.workedHours || 0,
            overtimeHours: 0,
            overtimeAmount: 0,
            status: 'CANCELLED',
          },
        });
      }
    }
    return null;
  }

  // Determine initial status: if schedule doesn't require approval, auto-approve
  const requiresApproval = schedule?.overtimeRequiresApproval ?? true;
  const initialStatus = requiresApproval ? 'PENDING' : 'APPROVED';

  if (existingOt) {
    // If it was already manually corrected or approved, retain status unless pending
    const status = existingOt.status === 'PENDING' ? initialStatus : existingOt.status;
    const updated = await client.overtime.update({
      where: { id: existingOt.id },
      data: {
        date: attendance.date,
        expectedHours: otCalc.expectedHours,
        actualHours: otCalc.actualHours,
        overtimeHours: existingOt.isManualCorrection ? existingOt.overtimeHours : otCalc.overtimeHours,
        hourlyRate: otCalc.hourlyRate,
        multiplier: otCalc.multiplier,
        overtimeRate: otCalc.overtimeRate,
        overtimeAmount: existingOt.isManualCorrection
          ? Math.round(existingOt.overtimeHours * otCalc.overtimeRate * 100) / 100
          : otCalc.overtimeAmount,
        status,
      },
    });
    return updated;
  }

  const created = await client.overtime.create({
    data: {
      employeeId: employee.id,
      attendanceId: attendance.id,
      date: attendance.date,
      expectedHours: otCalc.expectedHours,
      actualHours: otCalc.actualHours,
      overtimeHours: otCalc.overtimeHours,
      hourlyRate: otCalc.hourlyRate,
      multiplier: otCalc.multiplier,
      overtimeRate: otCalc.overtimeRate,
      overtimeAmount: otCalc.overtimeAmount,
      status: initialStatus,
      approvedAt: initialStatus === 'APPROVED' ? new Date() : null,
      approvedByName: initialStatus === 'APPROVED' ? 'System Auto-Approval' : null,
    },
  });

  return created;
}

/**
 * Fetch all APPROVED overtime records for an employee within a given date range.
 *
 * @param {string} employeeId
 * @param {Date} periodStart
 * @param {Date} periodEnd
 * @param {Object} [client] - Prisma client
 * @returns {Promise<{ totalOvertimeHours: number, totalOvertimeAmount: number, averageOvertimeRate: number, records: Array }>}
 */
async function getApprovedOvertimeForPeriod(employeeId, periodStart, periodEnd, client = defaultPrisma) {
  const records = await client.overtime.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      date: {
        gte: new Date(periodStart),
        lte: new Date(periodEnd),
      },
    },
    orderBy: { date: 'asc' },
  });

  let totalOvertimeHours = 0;
  let totalOvertimeAmount = 0;

  for (const rec of records) {
    totalOvertimeHours += rec.overtimeHours || 0;
    totalOvertimeAmount += rec.overtimeAmount || 0;
  }

  totalOvertimeHours = Math.round(totalOvertimeHours * 100) / 100;
  totalOvertimeAmount = Math.round(totalOvertimeAmount * 100) / 100;

  const averageOvertimeRate = totalOvertimeHours > 0
    ? Math.round((totalOvertimeAmount / totalOvertimeHours) * 100) / 100
    : 0;

  return {
    totalOvertimeHours,
    totalOvertimeAmount,
    averageOvertimeRate,
    records,
  };
}

module.exports = {
  getExpectedHoursForDay,
  getMultiplierForDate,
  calculateHourlyRate,
  calculateDailyOvertime,
  syncAttendanceOvertime,
  getApprovedOvertimeForPeriod,
};
