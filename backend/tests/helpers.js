const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db/pool');
const { migrate } = require('../src/db/migrate');

async function resetDatabase() {
  await migrate();
  await pool.query('TRUNCATE readings, users RESTART IDENTITY CASCADE');
}

async function registerUser(overrides = {}) {
  const body = {
    name: 'Test User',
    email: `user${Math.random().toString(36).slice(2)}@example.com`,
    password: 'password123',
    ...overrides,
  };
  const response = await request(app).post('/api/auth/register').send(body);
  return { token: response.body.token, user: response.body.user, body };
}

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

function addReading(token, reading) {
  return request(app).post('/api/readings').set(authHeader(token)).send(reading);
}

// Inserts directly, so tests can use dates the API would reject (for example the far past).
async function insertReadings(userId, rows) {
  for (const [date, slot, value] of rows) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES ($1, $2, $3, $4)',
      [userId, date, slot, value]
    );
  }
}

module.exports = { app, pool, resetDatabase, registerUser, authHeader, addReading, insertReadings };
