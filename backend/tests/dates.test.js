const {
  isValidDate,
  isValidMonth,
  getMonthToDateRange,
  getPreviousMonthRange,
  getMonthRangeFromString,
} = require('../src/utils/dates');

describe('date helpers', () => {
  test('isValidDate accepts real dates and rejects impossible ones', () => {
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('2026-1-1')).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  test('isValidMonth', () => {
    expect(isValidMonth('2026-03')).toBe(true);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-3')).toBe(false);
  });

  test('month-to-date runs from the 1st to the selected date', () => {
    expect(getMonthToDateRange('2026-03-15')).toEqual({ from: '2026-03-01', to: '2026-03-15' });
    expect(getMonthToDateRange('2026-03-01')).toEqual({ from: '2026-03-01', to: '2026-03-01' });
  });

  test('previous month covers the whole calendar month', () => {
    expect(getPreviousMonthRange('2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(getPreviousMonthRange('2024-03-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(getPreviousMonthRange('2026-05-31')).toEqual({ from: '2026-04-01', to: '2026-04-30' });
  });

  test('previous month wraps from January to December of the previous year', () => {
    expect(getPreviousMonthRange('2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('getMonthRangeFromString', () => {
    expect(getMonthRangeFromString('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
  });
});
