const express = require('express');
const pool = require('../db/pool');
const config = require('../config');
const { fieldErrors } = require('../utils/errors');
const {
  getToday,
  isValidDate,
  isValidMonth,
  getMonthRangeFromString,
  getMonthToDateRange,
  getPreviousMonthRange,
} = require('../utils/dates');

const router = express.Router();

function getDateParam(query) {
  const date = query.date ?? getToday(config.timezone);
  if (!isValidDate(date)) {
    throw fieldErrors(400, { date: 'date must be a valid date in YYYY-MM-DD format.' });
  }
  return date;
}

// With no readings in range: count is 0 and highest, lowest and average are null.
async function getStats(userId, from, to) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count,
            MAX(glucose_value) AS highest,
            MIN(glucose_value) AS lowest,
            ROUND(AVG(glucose_value), 1)::float AS average
     FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return rows[0];
}

router.get('/daily', async (req, res) => {
  const date = getDateParam(req.query);
  const stats = await getStats(req.userId, date, date);
  const { rows: readings } = await pool.query(
    `SELECT id, reading_date, time_slot, glucose_value FROM readings
     WHERE user_id = $1 AND reading_date = $2
     ORDER BY CASE time_slot
       WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2
       WHEN 'after_lunch' THEN 3 ELSE 4 END`,
    [req.userId, date]
  );
  res.json({ date, ...stats, readings });
});

router.get('/month-to-date', async (req, res) => {
  const date = getDateParam(req.query);
  const { from, to } = getMonthToDateRange(date);
  const stats = await getStats(req.userId, from, to);
  res.json({ date, from, to, ...stats });
});

router.get('/monthly', async (req, res) => {
  const date = getDateParam(req.query);
  const { from, to } = getPreviousMonthRange(date);
  const stats = await getStats(req.userId, from, to);
  res.json({ date, month: from.slice(0, 7), from, to, ...stats });
});

// Every reading in one calendar month, for the line chart.
router.get('/chart', async (req, res) => {
  const month = req.query.month ?? getToday(config.timezone).slice(0, 7);
  if (!isValidMonth(month)) {
    throw fieldErrors(400, { month: 'month must be in YYYY-MM format.' });
  }
  const { from, to } = getMonthRangeFromString(month);
  const { rows } = await pool.query(
    `SELECT reading_date, time_slot, glucose_value FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
     ORDER BY reading_date`,
    [req.userId, from, to]
  );
  res.json({ month, from, to, readings: rows });
});

module.exports = router;
