const { AppError } = require('../utils/errors');

function notFoundHandler(req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message, errors: error.errors });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
}

module.exports = { notFoundHandler, errorHandler };
