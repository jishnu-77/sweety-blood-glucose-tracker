import { buildChartData } from '../utils/chartData';
import { formatDate, formatMonth, getDaysInMonth } from '../utils/dates';
import { validateRegistration } from '../utils/validation';

describe('buildChartData', () => {
  test('has one row per day of the month and places readings on the right day and slot', () => {
    const rows = buildChartData('2026-02', [
      { reading_date: '2026-02-01', time_slot: 'morning', glucose_value: 98 },
      { reading_date: '2026-02-28', time_slot: 'after_dinner', glucose_value: 141 },
    ]);
    expect(rows).toHaveLength(28);
    expect(rows[0]).toEqual({ day: 1, morning: 98 });
    expect(rows[27]).toEqual({ day: 28, after_dinner: 141 });
    expect(rows[10]).toEqual({ day: 11 });
  });
});

describe('date formatting', () => {
  test('formats without shifting the day', () => {
    expect(formatDate('2026-03-01')).toBe('1 Mar 2026');
    expect(formatMonth('2026-12')).toBe('December 2026');
    expect(getDaysInMonth('2024-02')).toBe(29);
  });
});

describe('validateRegistration', () => {
  test('flags every invalid field', () => {
    expect(Object.keys(validateRegistration({ name: ' ', email: 'x', password: '123' }))).toEqual(['name', 'email', 'password']);
  });

  test('accepts valid details', () => {
    expect(validateRegistration({ name: 'Asha', email: 'asha@example.com', password: 'longenough' })).toEqual({});
  });
});
