const workingDaysService = require('../services/workingDaysService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Get active Working Days Policy
 */
async function getPolicy(req, res) {
  try {
    const { period } = req.query;
    const policy = await workingDaysService.getWorkingDaysPolicy(period);
    return sendSuccess(res, policy, 200, { message: 'Working days policy retrieved' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Update Working Days Policy and recompute draft payruns
 */
async function updatePolicy(req, res) {
  try {
    const { totalDays, effectivePeriod, name } = req.body;
    const policy = await workingDaysService.updateWorkingDaysPolicy({ totalDays, effectivePeriod, name });

    // Trigger recomputation of DRAFT/COMPUTED payruns in period or current year
    const year = effectivePeriod ? parseInt(effectivePeriod.split('-')[0], 10) : new Date().getFullYear();
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);

    const recomputeSummary = await workingDaysService.recomputeAffectedDraftPayruns(startDate, endDate);

    return sendSuccess(res, { policy, recomputeSummary }, 200, { message: 'Working days policy updated successfully' });
  } catch (err) {
    return sendError(res, err.message, 400);
  }
}

/**
 * Calculate dynamic period working days for a date range
 */
async function calculatePeriodDays(req, res) {
  try {
    const { periodStart, periodEnd } = req.query;
    if (!periodStart || !periodEnd) {
      return sendError(res, 'periodStart and periodEnd are required query params', 400);
    }
    const info = await workingDaysService.calculatePeriodWorkingDays(periodStart, periodEnd);
    return sendSuccess(res, info, 200, { message: 'Period working days calculated' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

module.exports = {
  getPolicy,
  updatePolicy,
  calculatePeriodDays,
};
