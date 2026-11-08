const express = require('express');
const pool = require('../db/pool');
const config = require('../config');
const { AppError, fieldErrors } = require('../utils/errors');
const { getToday, isValidDate } = require('../utils/dates');
const {
  TIME_SLOTS,
  MAX_READINGS_PER_DAY,
  MESSAGES,
  validateReadingInput,
  duplicateSlotMessage,
} = require('../utils/validation');

const router = express.Router();
const UNIQUE_VIOLATION = '23505';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const COLUMNS = 'id, reading_date, time_slot, glucose_value, created_at, updated_at';
const SLOT_ORDER = `ARRAY_POSITION(ARRAY[${Object.keys(TIME_SLOTS)
  .map((slot) => `'${slot}'`)
  .join(', ')}], time_slot)`;

function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return Number(value);
}

function parsePagination(query) {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, DEFAULT_LIMIT);
  const errors = {};
  if (page === null || page < 1) {
    errors.page = 'page must be a whole number of 1 or more.';
  }
  if (limit === null || limit < 1 || limit > MAX_LIMIT) {
    errors.limit = `limit must be a whole number between 1 and ${MAX_LIMIT}.`;
  }
  if (Object.keys(errors).length > 0) throw fieldErrors(400, errors);
  return { page, limit };
}

function parseReadingId(value) {
  if (!/^\d+$/.test(value) || Number(value) > 2147483647) {
    throw new AppError(404, 'Reading not found.');
  }
  return Number(value);
}

function validateBody(body) {
  const today = getToday(config.timezone);
  const { errors, values } = validateReadingInput(body, today);
  if (Object.keys(errors).length > 0) throw fieldErrors(400, errors);
  return values;
}

// Rules that depend on the readings already saved for that day.
// excludeId stops an edited reading from being counted against itself.
async function checkDayRules(userId, values, excludeId = null) {
  const { rows } = await pool.query(
    `SELECT time_slot FROM readings
     WHERE user_id = $1 AND reading_date = $2 AND id IS DISTINCT FROM $3`,
    [userId, values.reading_date, excludeId]
  );

  if (rows.length >= MAX_READINGS_PER_DAY) {
    throw fieldErrors(409, { reading_date: MESSAGES.dayFull });
  }
  if (rows.some((row) => row.time_slot === values.time_slot)) {
    throw fieldErrors(409, { time_slot: duplicateSlotMessage(values.time_slot) });
  }
}

// The UNIQUE constraint is the final safeguard if two requests race each other.
function handleSaveError(error, values) {
  if (error.code === UNIQUE_VIOLATION) {
    throw fieldErrors(409, { time_slot: duplicateSlotMessage(values.time_slot) });
  }
  throw error;
}

router.get('/', async (req, res) => {
  const { page, limit } = parsePagination(req.query);
  const { date } = req.query;
  if (date !== undefined && !isValidDate(date)) {
    throw fieldErrors(400, { date: 'date must be in YYYY-MM-DD format.' });
  }

  const params = [req.userId];
  let where = 'user_id = $1';
  if (date !== undefined) {
    params.push(date);
    where += ` AND reading_date = $${params.length}`;
  }

  const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`, params);
  const { total } = countResult.rows[0];

  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM readings WHERE ${where}
     ORDER BY reading_date DESC, ${SLOT_ORDER}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );

  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM readings WHERE id = $1 AND user_id = $2`,
    [parseReadingId(req.params.id), req.userId]
  );
  if (rows.length === 0) throw new AppError(404, 'Reading not found.');
  res.json({ reading: rows[0] });
});

router.post('/', async (req, res) => {
  const values = validateBody(req.body);
  await checkDayRules(req.userId, values);

  try {
    const { rows } = await pool.query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, $3, $4) RETURNING ${COLUMNS}`,
      [req.userId, values.reading_date, values.time_slot, values.glucose_value]
    );
    res.status(201).json({ reading: rows[0] });
  } catch (error) {
    handleSaveError(error, values);
  }
});

router.put('/:id', async (req, res) => {
  const id = parseReadingId(req.params.id);
  const existing = await pool.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [
    id,
    req.userId,
  ]);
  if (existing.rows.length === 0) throw new AppError(404, 'Reading not found.');

  const values = validateBody(req.body);
  await checkDayRules(req.userId, values, id);

  try {
    const { rows } = await pool.query(
      `UPDATE readings
       SET reading_date = $1, time_slot = $2, glucose_value = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5 RETURNING ${COLUMNS}`,
      [values.reading_date, values.time_slot, values.glucose_value, id, req.userId]
    );
    res.json({ reading: rows[0] });
  } catch (error) {
    handleSaveError(error, values);
  }
});

router.delete('/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [
    parseReadingId(req.params.id),
    req.userId,
  ]);
  if (rowCount === 0) throw new AppError(404, 'Reading not found.');
  res.status(204).end();
});

module.exports = router;
