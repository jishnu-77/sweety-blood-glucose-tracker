const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;

function pad(number) {
  return String(number).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidMonth(value) {
  if (typeof value !== 'string' || !MONTH_PATTERN.test(value)) return false;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12;
}

// Today's date as 'YYYY-MM-DD' in the given IANA time zone.
function getToday(timeZone) {
  return new Date().toLocaleDateString('en-CA', { timeZone });
}

// month is 1-12
function getMonthRange(year, month) {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: formatDate(year, month, 1), to: formatDate(year, month, lastDay) };
}

function getMonthRangeFromString(monthText) {
  const [year, month] = monthText.split('-').map(Number);
  return getMonthRange(year, month);
}

// First day of the date's month up to and including the date.
function getMonthToDateRange(date) {
  const [year, month] = date.split('-').map(Number);
  return { from: formatDate(year, month, 1), to: date };
}

// The whole calendar month before the date's month.
function getPreviousMonthRange(date) {
  let [year, month] = date.split('-').map(Number);
  month -= 1;
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return getMonthRange(year, month);
}

module.exports = {
  isValidDate,
  isValidMonth,
  getToday,
  getMonthRangeFromString,
  getMonthToDateRange,
  getPreviousMonthRange,
};
