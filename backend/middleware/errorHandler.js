import logger from '../config/logger.js';

// Custom AppError class inheriting from native Error
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // flag to distinguish client/known errors from unhandled bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

// Wrapper to eliminate duplicate try/catch in controllers
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Global centralized Error Middleware
export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log detailed error internally
  logger.error('[SERVER ERROR]', err);

  // Return clean JSON payload to user
  return res.status(err.statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error. Please contact support.',
    error: process.env.NODE_ENV === 'development' ? {
      stack: err.stack,
      ...err
    } : {}
  });
};
