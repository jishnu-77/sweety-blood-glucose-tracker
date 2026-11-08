const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { AppError, fieldErrors } = require('../utils/errors');

const router = express.Router();
const SALT_ROUNDS = 10;
const UNIQUE_VIOLATION = '23505';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createToken(userId) {
  return jwt.sign({}, config.jwtSecret, {
    subject: String(userId),
    expiresIn: config.jwtExpiresIn,
  });
}

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function validateRegistration({ name, email, password }) {
  const errors = {};
  if (typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Please enter your name.';
  } else if (name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Please enter a valid email address.';
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    errors.password = 'Password must be between 8 and 72 characters.';
  }
  return errors;
}

router.post('/register', async (req, res) => {
  const body = req.body || {};
  const errors = validateRegistration(body);
  if (Object.keys(errors).length > 0) throw fieldErrors(400, errors);

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    res.status(201).json({ token: createToken(rows[0].id), user: toPublicUser(rows[0]) });
  } catch (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw fieldErrors(409, { email: 'An account with this email already exists.' });
    }
    throw error;
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new AppError(400, 'Please enter your email and password.');
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  const user = rows[0];
  const passwordMatches = user && (await bcrypt.compare(password, user.password));
  if (!passwordMatches) {
    throw new AppError(401, 'Invalid email or password.');
  }

  res.json({ token: createToken(user.id), user: toPublicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [
    req.userId,
  ]);
  if (rows.length === 0) throw new AppError(401, 'Your account no longer exists.');
  res.json({ user: rows[0] });
});

module.exports = router;
