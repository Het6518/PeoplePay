// Consistent API response helpers

const sendSuccess = (res, data, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...meta,
  });
};

const sendError = (res, message, statusCode = 400, errors = []) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
};

const sendPaginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    data,
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / limit),
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
