function pad(number) {
  return String(number).padStart(2, '0');
}

// Today's date in the browser's time zone as 'YYYY-MM-DD'.
export function getToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Dates are handled as plain 'YYYY-MM-DD' strings and never pass through the browser's
// time zone, so the day can never shift. Month names are fixed so every browser agrees.
export function formatDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatLongDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// monthText is 'YYYY-MM'
export function formatMonth(monthText) {
  const [year, month] = monthText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function getDaysInMonth(monthText) {
  const [year, month] = monthText.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
