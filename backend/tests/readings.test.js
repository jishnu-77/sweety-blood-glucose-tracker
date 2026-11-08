const request = require('supertest');
const {
  app, pool, resetDatabase, registerUser, authHeader, addReading, insertReadings,
} = require('./helpers');
const { getToday } = require('../src/utils/dates');

const today = getToday('UTC');
const dayOffset = (days) =>
  new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const reading = (overrides = {}) => ({
  reading_date: today, time_slot: 'morning', glucose_value: 110, ...overrides,
});

let token;
beforeEach(async () => {
  await resetDatabase();
  ({ token } = await registerUser());
});
afterAll(() => pool.end());

describe('creating readings', () => {
  test('saves a valid reading', async () => {
    const response = await addReading(token, reading());
    expect(response.status).toBe(201);
    expect(response.body.reading).toMatchObject({
      reading_date: today, time_slot: 'morning', glucose_value: 110,
    });
    expect(response.body.reading.user_id).toBeUndefined();
  });

  test('requires a value', async () => {
    const response = await addReading(token, reading({ glucose_value: '' }));
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Please enter a glucose value.');
  });

  test.each([39, 601, 99.5, 'abc'])('rejects value %p', async (value) => {
    const response = await addReading(token, reading({ glucose_value: value }));
    expect(response.status).toBe(400);
    expect(response.body.errors.glucose_value).toBe('Value must be between 40 and 600 mg/dl.');
  });

  test('rejects a future date', async () => {
    const response = await addReading(token, reading({ reading_date: dayOffset(1) }));
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Date cannot be in the future.');
  });

  test('rejects a second reading for the same slot and date', async () => {
    await addReading(token, reading({ time_slot: 'after_breakfast' }));
    const response = await addReading(token, reading({ time_slot: 'after_breakfast', glucose_value: 150 }));
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You already have an after breakfast reading for this date.');
  });

  test('allows the same slot on a different day', async () => {
    await addReading(token, reading());
    const response = await addReading(token, reading({ reading_date: dayOffset(-1) }));
    expect(response.status).toBe(201);
  });

  test('allows only 4 readings per day', async () => {
    for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      expect((await addReading(token, reading({ time_slot: slot }))).status).toBe(201);
    }
    const response = await addReading(token, reading({ time_slot: 'morning', glucose_value: 99 }));
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You can add only 4 readings per day.');
  });

  test('ignores a user_id sent in the body', async () => {
    const other = await registerUser();
    const response = await addReading(token, { ...reading(), user_id: other.user.id });
    expect(response.status).toBe(201);
    const { rows } = await pool.query('SELECT user_id FROM readings');
    expect(rows[0].user_id).not.toBe(other.user.id);
  });

  test('the database itself rejects duplicates and unknown slots', async () => {
    const { user } = await registerUser();
    await insertReadings(user.id, [[today, 'morning', 100]]);
    await expect(insertReadings(user.id, [[today, 'morning', 120]])).rejects.toMatchObject({ code: '23505' });
    await expect(insertReadings(user.id, [[today, 'midnight', 120]])).rejects.toMatchObject({ code: '23514' });
  });
});

describe('viewing readings', () => {
  test('returns one reading by id', async () => {
    const { body } = await addReading(token, reading());
    const response = await request(app).get(`/api/readings/${body.reading.id}`).set(authHeader(token));
    expect(response.status).toBe(200);
    expect(response.body.reading.id).toBe(body.reading.id);
  });

  test('returns 404 for unknown or malformed ids', async () => {
    expect((await request(app).get('/api/readings/9999').set(authHeader(token))).status).toBe(404);
    expect((await request(app).get('/api/readings/abc').set(authHeader(token))).status).toBe(404);
  });

  test('lists newest day first and slots in daily order, and filters by date', async () => {
    await addReading(token, reading({ time_slot: 'after_dinner' }));
    await addReading(token, reading({ time_slot: 'morning' }));
    await addReading(token, reading({ reading_date: dayOffset(-1), time_slot: 'after_lunch' }));

    const all = await request(app).get('/api/readings').set(authHeader(token));
    expect(all.body.data.map((r) => [r.reading_date, r.time_slot])).toEqual([
      [today, 'morning'], [today, 'after_dinner'], [dayOffset(-1), 'after_lunch'],
    ]);

    const filtered = await request(app).get(`/api/readings?date=${today}`).set(authHeader(token));
    expect(filtered.body.data).toHaveLength(2);
    expect(filtered.body.pagination.total).toBe(2);
  });

  test('rejects an invalid date filter', async () => {
    const response = await request(app).get('/api/readings?date=yesterday').set(authHeader(token));
    expect(response.status).toBe(400);
  });
});

describe('pagination', () => {
  beforeEach(async () => {
    const { user } = await request(app).get('/api/auth/me').set(authHeader(token)).then((r) => r.body);
    const rows = [];
    for (let day = 0; day < 7; day += 1) {
      for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
        rows.push([dayOffset(-day), slot, 100 + day]);
      }
    }
    await insertReadings(user.id, rows); // 28 readings
  });

  test('uses page=1 and limit=20 by default', async () => {
    const response = await request(app).get('/api/readings').set(authHeader(token));
    expect(response.body.data).toHaveLength(20);
    expect(response.body.pagination).toEqual({ page: 1, limit: 20, total: 28, totalPages: 2 });
  });

  test('returns the remaining items on the last page', async () => {
    const response = await request(app).get('/api/readings?page=2&limit=20').set(authHeader(token));
    expect(response.body.data).toHaveLength(8);
    expect(response.body.pagination.page).toBe(2);
  });

  test('pages do not overlap', async () => {
    const first = await request(app).get('/api/readings?page=1&limit=10').set(authHeader(token));
    const second = await request(app).get('/api/readings?page=2&limit=10').set(authHeader(token));
    const ids = [...first.body.data, ...second.body.data].map((r) => r.id);
    expect(new Set(ids).size).toBe(20);
  });

  test('returns an empty list beyond the last page', async () => {
    const response = await request(app).get('/api/readings?page=9&limit=20').set(authHeader(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  test.each(['page=0', 'page=-1', 'page=abc', 'page=1.5', 'limit=0', 'limit=101', 'limit=abc'])(
    'rejects %s',
    async (query) => {
      const response = await request(app).get(`/api/readings?${query}`).set(authHeader(token));
      expect(response.status).toBe(400);
    }
  );
});

describe('editing readings', () => {
  test('updates the value without counting itself as a duplicate', async () => {
    const { body } = await addReading(token, reading());
    const response = await request(app)
      .put(`/api/readings/${body.reading.id}`)
      .set(authHeader(token))
      .send(reading({ glucose_value: 135 }));
    expect(response.status).toBe(200);
    expect(response.body.reading.glucose_value).toBe(135);
  });

  test('can edit a reading on a day that already has 4 readings', async () => {
    let lastId;
    for (const slot of ['morning', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      lastId = (await addReading(token, reading({ time_slot: slot }))).body.reading.id;
    }
    const response = await request(app)
      .put(`/api/readings/${lastId}`)
      .set(authHeader(token))
      .send(reading({ time_slot: 'after_dinner', glucose_value: 160 }));
    expect(response.status).toBe(200);
  });

  test('still blocks moving a reading onto a slot that is taken', async () => {
    await addReading(token, reading({ time_slot: 'morning' }));
    const { body } = await addReading(token, reading({ time_slot: 'after_lunch' }));
    const response = await request(app)
      .put(`/api/readings/${body.reading.id}`)
      .set(authHeader(token))
      .send(reading({ time_slot: 'morning' }));
    expect(response.status).toBe(409);
    expect(response.body.message).toBe('You already have a morning (fasting) reading for this date.');
  });

  test('applies the same validation as creating', async () => {
    const { body } = await addReading(token, reading());
    const response = await request(app)
      .put(`/api/readings/${body.reading.id}`)
      .set(authHeader(token))
      .send(reading({ glucose_value: 700 }));
    expect(response.status).toBe(400);
  });
});

describe('deleting readings', () => {
  test('removes the reading and frees the slot', async () => {
    const { body } = await addReading(token, reading());
    const response = await request(app).delete(`/api/readings/${body.reading.id}`).set(authHeader(token));
    expect(response.status).toBe(204);
    expect((await addReading(token, reading())).status).toBe(201);
  });

  test('returns 404 when the reading does not exist', async () => {
    const response = await request(app).delete('/api/readings/12345').set(authHeader(token));
    expect(response.status).toBe(404);
  });

  test('deleting a user removes their readings (ON DELETE CASCADE)', async () => {
    await addReading(token, reading());
    await pool.query('DELETE FROM users');
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM readings');
    expect(rows[0].count).toBe(0);
  });
});

describe('user isolation', () => {
  test("a user cannot see, edit or delete another user's readings", async () => {
    const { body } = await addReading(token, reading());
    const other = await registerUser();
    const id = body.reading.id;

    const list = await request(app).get('/api/readings').set(authHeader(other.token));
    expect(list.body.data).toEqual([]);
    expect((await request(app).get(`/api/readings/${id}`).set(authHeader(other.token))).status).toBe(404);
    expect((await request(app).put(`/api/readings/${id}`).set(authHeader(other.token)).send(reading())).status).toBe(404);
    expect((await request(app).delete(`/api/readings/${id}`).set(authHeader(other.token))).status).toBe(404);

    const stillThere = await request(app).get(`/api/readings/${id}`).set(authHeader(token));
    expect(stillThere.status).toBe(200);
  });

  test('two users can each have a reading for the same slot and date', async () => {
    const other = await registerUser();
    expect((await addReading(token, reading())).status).toBe(201);
    expect((await addReading(other.token, reading())).status).toBe(201);
  });
});
