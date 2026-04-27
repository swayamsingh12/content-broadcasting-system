const { error: errorResponse } = require('../utils/responseHelper');

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Express 4 doesn't catch async throws by default — wrap so they reach errorHandler.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return errorResponse(res, err.statusCode, err.message, err.details);
  }

  if (err && err.isJoi) {
    const details = (err.details || []).map((d) => ({
      field: Array.isArray(d.path) ? d.path.join('.') : String(d.path || ''),
      message: String(d.message || '').replace(/"/g, ''),
    }));
    return errorResponse(res, 400, 'Validation failed', details);
  }

  // pg unique-violation
  if (err && err.code === '23505') {
    return errorResponse(res, 409, 'Resource already exists');
  }
  // pg foreign-key violation
  if (err && err.code === '23503') {
    return errorResponse(res, 400, 'Referenced resource does not exist');
  }
  // pg invalid_text_representation (e.g. malformed UUID into a uuid column)
  if (err && err.code === '22P02') {
    return errorResponse(res, 400, 'Malformed input value');
  }

  if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    return errorResponse(res, 401, 'Invalid or expired token');
  }

  if (err && err.type === 'entity.parse.failed') {
    return errorResponse(res, 400, 'Malformed JSON body');
  }
  if (err && err.type === 'entity.too.large') {
    return errorResponse(res, 413, 'Request body too large');
  }

  // Log full error server-side; client only sees a generic 500.
  console.error('[error]', err);
  // In dev mode, surface the underlying error message + name so curl/Postman shows it.
  const isDev = process.env.NODE_ENV !== 'production';
  const debug = isDev
    ? { name: err && err.name, message: err && err.message, code: err && err.code }
    : null;
  return errorResponse(res, 500, 'Internal Server Error', debug);
};

const notFoundHandler = (req, res) =>
  errorResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);

module.exports = { errorHandler, notFoundHandler, asyncHandler, AppError };
