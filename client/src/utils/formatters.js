/**
 * Format a number as Indian Rupee currency.
 * @param {number|null|undefined} amount
 * @returns {string}  e.g. "₹1,23,456.00"
 */
export const formatINR = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Format a date value as "DD Mon YYYY".
 * @param {string|Date|null|undefined} date
 * @returns {string}  e.g. "05 Sep 2026" or "-"
 */
export const formatDate = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};

/**
 * Format a date-time value as "DD Mon YYYY, HH:MM".
 * @param {string|Date|null|undefined} date
 * @returns {string}  e.g. "05 Sep 2026, 10:47 am" or "-"
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

/**
 * Format a date value as a 12-hour time string.
 * @param {string|Date|null|undefined} date
 * @returns {string}  e.g. "10:47 AM" or "-"
 */
export const formatTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

/**
 * Format a "YYYY-MM" string as a human-readable month label.
 * @param {string|null|undefined} dateStr  e.g. "2026-09"
 * @returns {string}  e.g. "Sep 2026" or "-"
 */
export const formatMonth = (dateStr) => {
  if (!dateStr) return '-';
  const [year, month] = dateStr.split('-');
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(year), Number(month) - 1));
};

/**
 * Generate initials from a first and last name.
 * @param {string|null|undefined} firstName
 * @param {string|null|undefined} lastName
 * @returns {string}  e.g. "JD"
 */
export const getInitials = (firstName, lastName) => {
  const first = (firstName || '')[0] || '';
  const last = (lastName || '')[0] || '';
  return `${first}${last}`.toUpperCase();
};

/**
 * Return a human-readable label for an employee type code.
 * @param {'FULL_TIME'|'PART_TIME'|'CONTRACT'|string} type
 * @returns {string}
 */
export const employeeTypeBadge = (type) => {
  const labels = {
    FULL_TIME: 'Full Time',
    PART_TIME: 'Part Time',
    CONTRACT: 'Contract',
  };
  return labels[type] ?? type;
};
