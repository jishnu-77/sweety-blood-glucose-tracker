const request = require('supertest');
const { app, pool, resetDatabase, registerUser, authHeader, insertReadings } = require('./helpers');

let token;
let userId;

const get = (path, authToken = token) => request(app).get(path).set(authHeader(authToken));

beforeEach(async () => {
  await resetDatabase();
  ({ token, user: { id: userId } } = await registerUser());
});
afterAll(() => pool.end());

describe('daily report', () => {
  test('returns highest, lowest, average (1 decimal), count and readings in slot order', async () => {
    await insertReadings(userId, [
      ['2026-03-15', 'after_dinner', 131],
      ['2026-03-15', 'morning', 90],
      ['2026-03-15', 'after_lunch', 140],
      ['2026-03-14', 'morning', 300], // another day, must be ignored
    ]);
    const { body, status } = await get('/api/reports/daily?date=2026-03-15');

    expect(status).toBe(200);
    expect(body).toMatchObject({ date: '2026-03-15', count: 3, highest: 140, lowest: 90, average: 120.3 });
    expect(body.readings.map((r) => r.time_slot)).toEqual(['morning', 'after_lunch', 'after_dinner']);
  });

  test('returns an empty report when there are no readings', async () => {
    const { body } = await get('/api/reports/daily?date=2026-03-15');
    expect(body).toMatchObject({ count: 0, highest: null, lowest: null, average: null, readings: [] });
  });

  test('rejects an invalid date', async () => {
    expect((await get('/api/reports/daily?date=2026-02-30')).status).toBe(400);
    expect((await get('/api/reports/daily?date=abc')).status).toBe(400);
  });
});

describe('month-to-date report', () => {
  beforeEach(async () => {
    await insertReadings(userId, [
      ['2026-02-28', 'morning', 500], // previous month
      ['2026-03-01', 'morning', 100], // first day included
      ['2026-03-10', 'morning', 120],
      ['2026-03-15', 'morning', 141], // selected day included
      ['2026-03-16', 'morning', 400], // after the selected date
    ]);
  });

  test('covers the 1st of the month up to and including the selected date', async () => {
    const { body } = await get('/api/reports/month-to-date?date=2026-03-15');
    expect(body).toMatchObject({
      from: '2026-03-01', to: '2026-03-15', count: 3, highest: 141, lowest: 100, average: 120.3,
    });
  });

  test('on the 1st it only includes that day', async () => {
    const { body } = await get('/api/reports/month-to-date?date=2026-03-01');
    expect(body).toMatchObject({ count: 1, highest: 100, lowest: 100, average: 100 });
  });
});

describe('monthly (previous month) report', () => {
  test('covers the whole previous calendar month and nothing else', async () => {
    await insertReadings(userId, [
      ['2026-01-31', 'morning', 500], // two months back
      ['2026-02-01', 'morning', 100], // first day included
      ['2026-02-14', 'after_lunch', 160],
      ['2026-02-28', 'after_dinner', 130], // last day included
      ['2026-03-01', 'morning', 450], // selected month
    ]);
    const { body } = await get('/api/reports/monthly?date=2026-03-15');
    expect(body).toMatchObject({
      month: '2026-02', from: '2026-02-01', to: '2026-02-28',
      count: 3, highest: 160, lowest: 100, average: 130,
    });
  });

  test('handles a leap year February', async () => {
    await insertReadings(userId, [['2024-02-29', 'morning', 111], ['2024-03-01', 'morning', 222]]);
    const { body } = await get('/api/reports/monthly?date=2024-03-20');
    expect(body).toMatchObject({ to: '2024-02-29', count: 1, highest: 111 });
  });

  test('wraps from January to December of the previous year', async () => {
    await insertReadings(userId, [['2025-12-31', 'morning', 99], ['2026-01-01', 'morning', 300]]);
    const { body } = await get('/api/reports/monthly?date=2026-01-10');
    expect(body).toMatchObject({ month: '2025-12', from: '2025-12-01', to: '2025-12-31', count: 1, lowest: 99 });
  });

  test('is empty when the previous month has no readings', async () => {
    const { body } = await get('/api/reports/monthly?date=2026-03-15');
    expect(body).toMatchObject({ count: 0, highest: null, lowest: null, average: null });
  });
});

describe('chart data', () => {
  test('returns only the requested month, in date order', async () => {
    await insertReadings(userId, [
      ['2026-03-02', 'morning', 100],
      ['2026-03-01', 'morning', 90],
      ['2026-04-01', 'morning', 200],
    ]);
    const { body } = await get('/api/reports/chart?month=2026-03');
    expect(body.readings.map((r) => r.reading_date)).toEqual(['2026-03-01', '2026-03-02']);
  });

  test('rejects an invalid month', async () => {
    expect((await get('/api/reports/chart?month=2026-13')).status).toBe(400);
  });
});

describe('report privacy', () => {
  test("never includes another user's readings", async () => {
    const other = await registerUser();
    await insertReadings(other.user.id, [['2026-03-15', 'morning', 555]]);
    await insertReadings(userId, [['2026-03-15', 'morning', 100]]);

    for (const path of ['daily', 'month-to-date', 'monthly']) {
      const { body } = await get(`/api/reports/${path}?date=2026-03-15`);
      expect(body.highest === null || body.highest < 555).toBe(true);
    }
    const { body } = await get('/api/reports/daily?date=2026-03-15');
    expect(body).toMatchObject({ count: 1, highest: 100 });
  });
});
