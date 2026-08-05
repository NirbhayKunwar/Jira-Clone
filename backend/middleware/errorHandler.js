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
  const statusCode = err.statusCode || 500;
  const requestId = req.headers['x-request-id'] || req.headers['x-vercel-id'] || `req_${Date.now()}`;

  logger.error({ err, requestId, url: req.originalUrl }, '[SERVER ERROR]');

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error. Please contact support.',
    code: err.code || (statusCode >= 500 ? 'AUTH_LOGIN_FAILED' : 'BAD_REQUEST'),
    requestId,
    timestamp: new Date().toISOString()
  });
};
