const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

// Reads the user id from the verified token. Never from the request body or query.
function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Authentication required.');
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = Number(payload.sub);
  } catch {
    throw new AppError(401, 'Your session has expired. Please log in again.');
  }
  next();
}

module.exports = { requireAuth };
