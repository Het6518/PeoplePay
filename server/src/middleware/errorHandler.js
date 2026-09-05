const { ZodError } = require('zod');
const { sendError } = require('../utils/response');

// Centralized error handler - must be last middleware
const errorHandler = (err, req, res, next) => {
  console.error('[Error]', err.message || err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation failed. Please check your input.', 422, errors);
  }

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return sendError(res, `A record with this ${field} already exists.`, 409);
  }

  // Prisma foreign key constraint
  if (err.code === 'P2003') {
    return sendError(res, 'Related record not found. Please check your data.', 400);
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return sendError(res, 'Record not found.', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token expired. Please login again.', 401);
  }

  // Business logic errors (thrown manually with status)
  if (err.statusCode) {
    return sendError(res, err.message, err.statusCode);
  }

  // Fallback
  const isDev = process.env.NODE_ENV === 'development';
  return sendError(
    res,
    isDev ? err.message : 'An unexpected error occurred.',
    500
  );
};

// Create typed business error
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
