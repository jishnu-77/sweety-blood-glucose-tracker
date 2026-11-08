const bcrypt = require('bcrypt');
const pool = require('./pool');
const config = require('../config');
const { migrate } = require('./migrate');
const { getToday } = require('../utils/dates');
const { TIME_SLOTS } = require('../utils/validation');

const DEMO_USER = { name: 'Demo User', email: 'demo@sweety.app', password: 'Demo@1234' };
const DAYS_OF_HISTORY = 75; // covers this month and the whole previous month

// Typical glucose range for each slot, so the sample data looks realistic.
const SLOT_RANGES = {
  morning: [88, 128],
  after_breakfast: [118, 182],
  after_lunch: [112, 170],
  after_dinner: [108, 165],
};

// Small deterministic random generator so every seed run produces the same shape of data.
function createRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function shiftDate(dateText, days) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function buildReadings(today) {
  const random = createRandom(42);
  const readings = [];
  for (let daysAgo = 0; daysAgo < DAYS_OF_HISTORY; daysAgo += 1) {
    const date = shiftDate(today, -daysAgo);
    for (const slot of Object.keys(TIME_SLOTS)) {
      if (random() < 0.15) continue; // a few missed readings
      const [low, high] = SLOT_RANGES[slot];
      readings.push([date, slot, Math.round(low + random() * (high - low))]);
    }
  }
  return readings;
}

async function seed() {
  await migrate();
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password = EXCLUDED.password
     RETURNING id`,
    [DEMO_USER.name, DEMO_USER.email, passwordHash]
  );
  const userId = rows[0].id;

  const readings = buildReadings(getToday(config.timezone));
  await pool.query('DELETE FROM readings WHERE user_id = $1', [userId]);
  for (const [date, slot, value] of readings) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES ($1, $2, $3, $4)',
      [userId, date, slot, value]
    );
  }

  console.log(`Seeded ${readings.length} readings for ${DEMO_USER.email} (password: ${DEMO_USER.password})`);
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
