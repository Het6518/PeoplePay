const prisma = require('../config/prisma');

/**
 * Fetch holidays from Calendarific API
 */
async function fetchCalendarificHolidays(year, country = 'IN') {
  const apiKey = (process.env.CALENDARIFIC_API_KEY || '').trim();
  if (!apiKey || apiKey === 'YOUR_CALENDARIFIC_API_KEY_HERE') {
    throw new Error('Calendarific API key not configured');
  }

  const url = `https://calendarific.com/api/v2/holidays?api_key=${encodeURIComponent(apiKey)}&country=${country}&year=${year}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplePay360/1.0' } });
  
  if (!res.ok) {
    throw new Error(`Calendarific API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  if (data.meta?.code !== 200 || !data.response?.holidays) {
    throw new Error(data.meta?.error_detail || 'Invalid response from Calendarific API');
  }

  return data.response.holidays.map(h => ({
    date: h.date.iso ? h.date.iso.split('T')[0] : `${h.date.datetime.year}-${String(h.date.datetime.month).padStart(2, '0')}-${String(h.date.datetime.day).padStart(2, '0')}`,
    name: h.name,
    country: country,
    source: 'API_CALENDARIFIC',
    type: Array.isArray(h.type) ? h.type.join(', ') : (h.type || 'Holiday'),
  }));
}

/**
 * Fetch holidays from Nager.Date API (Fallback)
 */
async function fetchNagerHolidays(year, country = 'IN') {
  const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplePay360/1.0' } });

  if (!res.ok) {
    throw new Error(`Nager.Date API returned HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    throw new Error('Invalid response from Nager.Date API');
  }

  return data.map(h => ({
    date: h.date,
    name: h.localName || h.name,
    country: country,
    source: 'API_NAGER',
    type: h.types ? h.types.join(', ') : 'Public Holiday',
  }));
}

/**
 * Sync holidays into database suggestions table with non-blocking error handling
 */
async function syncHolidaysForYear(year = new Date().getFullYear(), country = 'IN') {
  let holidays = [];
  let sourceUsed = 'API_CALENDARIFIC';
  let syncError = null;

  try {
    holidays = await fetchCalendarificHolidays(year, country);
  } catch (err1) {
    console.warn(`[HolidaySync] Calendarific API skipped/failed: ${err1.message}. Trying Nager.Date fallback...`);
    try {
      holidays = await fetchNagerHolidays(year, country);
      sourceUsed = 'API_NAGER';
    } catch (err2) {
      console.warn(`[HolidaySync] Nager.Date API fallback failed: ${err2.message}. Using offline database cache.`);
      syncError = `API Sync warning: ${err1.message}; Fallback: ${err2.message}`;
      sourceUsed = 'CACHE';
    }
  }

  let upsertedCount = 0;
  if (holidays.length > 0) {
    for (const item of holidays) {
      try {
        const holidayDate = new Date(item.date);
        await prisma.holidaySuggestion.upsert({
          where: {
            date_name: {
              date: holidayDate,
              name: item.name,
            },
          },
          update: {
            country: item.country,
            source: item.source,
          },
          create: {
            date: holidayDate,
            name: item.name,
            country: item.country,
            source: item.source,
            status: 'PENDING',
          },
        });
        upsertedCount++;
      } catch (dbErr) {
        // Continue loop if one entry fails
      }
    }
  }

  return {
    success: holidays.length > 0 || sourceUsed === 'CACHE',
    count: upsertedCount,
    source: sourceUsed,
    warning: syncError,
  };
}

/**
 * Get all pending holiday suggestions
 */
async function getPendingSuggestions() {
  return prisma.holidaySuggestion.findMany({
    where: { status: 'PENDING' },
    orderBy: { date: 'asc' },
    include: { companyHoliday: true },
  });
}

/**
 * Get all company approved holidays
 */
async function getCompanyHolidays(startDate, endDate) {
  const where = {};
  if (startDate && endDate) {
    where.date = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }
  return prisma.companyHoliday.findMany({
    where,
    orderBy: { date: 'asc' },
  });
}

/**
 * Process a holiday suggestion (Approve Paid, Approve Unpaid, Reject)
 */
async function processSuggestion(id, status) {
  const suggestion = await prisma.holidaySuggestion.findUnique({
    where: { id },
  });

  if (!suggestion) {
    throw new Error('Holiday suggestion not found');
  }

  const updatedSuggestion = await prisma.holidaySuggestion.update({
    where: { id },
    data: { status },
  });

  let companyHoliday = null;
  if (status === 'APPROVED_PAID' || status === 'APPROVED_UNPAID') {
    const isPaid = status === 'APPROVED_PAID';
    companyHoliday = await prisma.companyHoliday.upsert({
      where: { linkedSuggestionId: id },
      update: {
        isPaid,
        name: suggestion.name,
        date: suggestion.date,
      },
      create: {
        date: suggestion.date,
        name: suggestion.name,
        isPaid,
        linkedSuggestionId: id,
      },
    });
  } else if (status === 'REJECTED') {
    await prisma.companyHoliday.deleteMany({
      where: { linkedSuggestionId: id },
    });
  }

  return { suggestion: updatedSuggestion, companyHoliday };
}

/**
 * Create a manual holiday entry
 */
async function createManualHoliday({ name, date, isPaid = true }) {
  const holidayDate = new Date(date);
  
  // Create suggestion as approved
  const suggestion = await prisma.holidaySuggestion.create({
    data: {
      name,
      date: holidayDate,
      source: 'MANUAL',
      status: isPaid ? 'APPROVED_PAID' : 'APPROVED_UNPAID',
    },
  });

  const companyHoliday = await prisma.companyHoliday.create({
    data: {
      name,
      date: holidayDate,
      isPaid,
      linkedSuggestionId: suggestion.id,
    },
  });

  return { suggestion, companyHoliday };
}

module.exports = {
  fetchCalendarificHolidays,
  fetchNagerHolidays,
  syncHolidaysForYear,
  getPendingSuggestions,
  getCompanyHolidays,
  processSuggestion,
  createManualHoliday,
};
