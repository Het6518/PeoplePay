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
  const numPage = Number(page) || 1;
  const numLimit = Number(limit) || 10;
  const numTotal = Number(total) || 0;
  const totalPages = Math.ceil(numTotal / numLimit) || 1;

  return res.status(200).json({
    success: true,
    data,
    page: numPage,
    limit: numLimit,
    total: numTotal,
    totalPages,
    pagination: {
      page: numPage,
      limit: numLimit,
      total: numTotal,
      totalPages,
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
