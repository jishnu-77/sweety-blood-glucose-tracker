class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// Build an AppError from a { field: message } object; the first message becomes the main message.
function fieldErrors(status, errors) {
  return new AppError(status, Object.values(errors)[0], errors);
}

module.exports = { AppError, fieldErrors };
