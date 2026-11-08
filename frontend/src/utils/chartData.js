import { getDaysInMonth } from './dates';

// Turns the month's readings into one row per day: { day: 3, morning: 98, after_lunch: 141 }.
// Every day of the month gets a row so the x-axis always spans the full month.
export function buildChartData(month, readings) {
  const rows = Array.from({ length: getDaysInMonth(month) }, (_, index) => ({ day: index + 1 }));
  readings.forEach((reading) => {
    const day = Number(reading.reading_date.slice(8, 10));
    rows[day - 1][reading.time_slot] = reading.glucose_value;
  });
  return rows;
}
