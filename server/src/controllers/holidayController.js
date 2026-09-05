const holidayService = require('../services/holidayService');
const workingDaysService = require('../services/workingDaysService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Get all pending holiday suggestions
 */
async function getPendingSuggestions(req, res) {
  try {
    const suggestions = await holidayService.getPendingSuggestions();
    return sendSuccess(res, suggestions, 200, { message: 'Pending holiday suggestions fetched' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Sync holidays from Calendarific / Nager.Date API
 */
async function syncHolidays(req, res) {
  try {
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const result = await holidayService.syncHolidaysForYear(year);
    return sendSuccess(res, result, 200, { message: 'Holiday sync executed' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Process a holiday suggestion (Approve Paid / Approve Unpaid / Reject)
 */
async function processSuggestion(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['APPROVED_PAID', 'APPROVED_UNPAID', 'REJECTED'].includes(status)) {
      return sendError(res, 'Invalid status. Must be APPROVED_PAID, APPROVED_UNPAID, or REJECTED.', 400);
    }

    const result = await holidayService.processSuggestion(id, status);

    // Trigger recomputation of DRAFT/COMPUTED payruns in affected month
    const holidayDate = result.suggestion.date;
    const periodStart = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), 1);
    const periodEnd = new Date(holidayDate.getFullYear(), holidayDate.getMonth() + 1, 0);

    const recomputeSummary = await workingDaysService.recomputeAffectedDraftPayruns(periodStart, periodEnd);

    return sendSuccess(res, { ...result, recomputeSummary }, 200, { message: `Holiday suggestion processed as ${status}` });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Create a manual holiday entry
 */
async function createManualHoliday(req, res) {
  try {
    const { name, date, isPaid } = req.body;
    if (!name || !date) {
      return sendError(res, 'Name and date are required', 400);
    }

    const result = await holidayService.createManualHoliday({ name, date, isPaid });

    const holidayDate = new Date(date);
    const periodStart = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), 1);
    const periodEnd = new Date(holidayDate.getFullYear(), holidayDate.getMonth() + 1, 0);

    const recomputeSummary = await workingDaysService.recomputeAffectedDraftPayruns(periodStart, periodEnd);

    return sendSuccess(res, { ...result, recomputeSummary }, 201, { message: 'Manual holiday created' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

/**
 * Get approved company holidays
 */
async function getCompanyHolidays(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const holidays = await holidayService.getCompanyHolidays(startDate, endDate);
    return sendSuccess(res, holidays, 200, { message: 'Company holidays fetched' });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
}

module.exports = {
  getPendingSuggestions,
  syncHolidays,
  processSuggestion,
  createManualHoliday,
  getCompanyHolidays,
};
