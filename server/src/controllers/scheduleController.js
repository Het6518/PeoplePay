const prisma = require('../config/prisma');
const { CreateScheduleSchema, UpdateScheduleSchema } = require('../validators/schemas');
const { sendSuccess, sendError } = require('../utils/response');

// Calculate total weekly hours from days config
function calculateWeeklyHours(days) {
  let total = 0;
  for (const day of days) {
    if (!day.isWorkday || !day.startTime || !day.endTime) continue;
    const [startH, startM] = day.startTime.split(':').map(Number);
    const [endH, endM] = day.endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM) - (day.breakMinutes || 0);
    if (totalMinutes > 0) total += totalMinutes / 60;
  }
  return Math.round(total * 100) / 100;
}

// GET /api/schedules
const getSchedules = async (req, res, next) => {
  try {
    const schedules = await prisma.workingSchedule.findMany({
      orderBy: { name: 'asc' },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { employees: true } },
      },
    });
    return sendSuccess(res, schedules);
  } catch (err) {
    next(err);
  }
};

// GET /api/schedules/:id
const getSchedule = async (req, res, next) => {
  try {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: {
        days: { orderBy: { dayOfWeek: 'asc' } },
        _count: { select: { employees: true } },
      },
    });
    if (!schedule) return sendError(res, 'Schedule not found.', 404);
    return sendSuccess(res, schedule);
  } catch (err) {
    next(err);
  }
};

// POST /api/schedules
const createSchedule = async (req, res, next) => {
  try {
    const { days, ...scheduleData } = CreateScheduleSchema.parse(req.body);
    const weeklyHours = calculateWeeklyHours(days);

    const schedule = await prisma.workingSchedule.create({
      data: {
        ...scheduleData,
        weeklyHours,
        days: { create: days },
      },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    return sendSuccess(res, schedule, 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/schedules/:id
const updateSchedule = async (req, res, next) => {
  try {
    const { days, ...scheduleData } = UpdateScheduleSchema.parse(req.body);

    let weeklyHours;
    if (days) weeklyHours = calculateWeeklyHours(days);

    await prisma.$transaction(async (tx) => {
      if (days) {
        await tx.workingScheduleDay.deleteMany({ where: { scheduleId: req.params.id } });
        await tx.workingScheduleDay.createMany({
          data: days.map((d) => ({ ...d, scheduleId: req.params.id })),
        });
      }
      await tx.workingSchedule.update({
        where: { id: req.params.id },
        data: { ...scheduleData, ...(weeklyHours !== undefined ? { weeklyHours } : {}) },
      });
    });

    const updated = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { days: { orderBy: { dayOfWeek: 'asc' } } },
    });

    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/schedules/:id
const deleteSchedule = async (req, res, next) => {
  try {
    const schedule = await prisma.workingSchedule.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { employees: true } } },
    });
    if (!schedule) return sendError(res, 'Schedule not found.', 404);
    if (schedule._count.employees > 0) {
      return sendError(res, 'Cannot delete schedule assigned to employees.', 400);
    }
    await prisma.workingSchedule.delete({ where: { id: req.params.id } });
    return sendSuccess(res, { message: 'Schedule deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSchedules, getSchedule, createSchedule, updateSchedule, deleteSchedule, calculateWeeklyHours };
