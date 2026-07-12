import rateLimit from 'express-rate-limit';

/**
 * NOTE ON SERVERLESS RATE LIMITING (NO REDIS):
 * In-memory rate limiting via express-rate-limit is instance-specific in serverless/lambda 
 * environments (e.g., Vercel, AWS Lambda) as each function container execution context is isolated.
 * While this means the rate limits are per-instance and not globally synchronized, this is 
 * acceptable for this project's serverless architecture as it completely avoids external 
 * database lookups or Redis dependencies, ensuring optimal latency, stability, and zero setup costs.
 */

// Helper to construct rate limit message
const limitMessage = {
  success: false,
  message: 'Too many requests. Please try again later.'
};

// authLimiter: Auth endpoints (Login, Register, Google Signin, Password changes)
export const authLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_AUTH_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS)
    : 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_AUTH_MAX
    ? parseInt(process.env.RATE_LIMIT_AUTH_MAX)
    : 15,
  message: limitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

// otpLimiter: Strict limits for Otp code delivery endpoint to prevent email spamming
export const otpLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_OTP_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS)
    : 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_OTP_MAX
    ? parseInt(process.env.RATE_LIMIT_OTP_MAX)
    : 5,
  message: limitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

// apiLimiter: General API CRUD endpoints (Workspaces, Tasks, Goals, Teams, Sprints)
export const apiLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_API_WINDOW_MS
    ? parseInt(process.env.RATE_LIMIT_API_WINDOW_MS)
    : 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_API_MAX
    ? parseInt(process.env.RATE_LIMIT_API_MAX)
    : 150,
  message: limitMessage,
  standardHeaders: true,
  legacyHeaders: false,
});

// rateLimiter: Backward compatible fallback function
export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: limitMessage,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

