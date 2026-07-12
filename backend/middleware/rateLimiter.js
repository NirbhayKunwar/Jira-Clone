import rateLimit from 'express-rate-limit';

export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  // Read config from env if available
  const envWindowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : windowMs;
  const envMaxRequests = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : maxRequests;

  return rateLimit({
    windowMs: envWindowMs,
    max: envMaxRequests,
    message: {
      success: false,
      message: 'Too many requests, please try again later.',
      data: null,
      error: { code: 'RATE_LIMIT_EXCEEDED' }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
