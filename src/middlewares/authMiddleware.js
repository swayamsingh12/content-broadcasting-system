const jwt = require('jsonwebtoken');
const { error } = require('../utils/responseHelper');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return error(res, 401, 'Missing or malformed Authorization header');
  }

  const token = header.slice(7).trim();
  if (!token) {
    return error(res, 401, 'Missing JWT token');
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch (err) {
    // Collapse expired + malformed into one 401 — don't leak which it was.
    return error(res, 401, 'Invalid or expired token');
  }
};

module.exports = { authenticate };
