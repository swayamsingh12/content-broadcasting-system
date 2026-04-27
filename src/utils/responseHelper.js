const success = (res, statusCode, message, data = null, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

const error = (res, statusCode, message, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data,
  });
};

const buildPagination = (currentPage, limit, totalItems) => {
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;
  return {
    currentPage,
    totalPages,
    totalItems,
    limit,
  };
};

module.exports = { success, error, buildPagination };
