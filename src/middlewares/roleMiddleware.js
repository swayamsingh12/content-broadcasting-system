const { error } = require('../utils/responseHelper');

const requireRole = (...allowed) => {
  const allowedSet = new Set(allowed.flat());

  return (req, res, next) => {
    if (!req.user) {
      return error(res, 401, 'Authentication required');
    }
    if (!allowedSet.has(req.user.role)) {
      return error(
        res,
        403,
        `Forbidden: this action is restricted to ${[...allowedSet].join(', ')}`,
      );
    }
    return next();
  };
};

module.exports = { requireRole };
