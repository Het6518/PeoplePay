// Consistent API response helpers

const sendSuccess = (res, data, statusCodeOrMessage = 200, meta = {}) => {
  let statusCode = 200;
  let message = undefined;

  if (typeof statusCodeOrMessage === 'number') {
    statusCode = statusCodeOrMessage;
  } else if (typeof statusCodeOrMessage === 'string') {
    message = statusCodeOrMessage;
  }

  const payload = {
    success: true,
    data,
    ...meta,
  };
  if (message) payload.message = message;

  return res.status(statusCode).json(payload);
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
