import rateLimit from 'express-rate-limit';

/**
 * NOTE ON SERVERLESS RATE LIMITING (NO REDIS):
 * In-memory rate limiting via express-rate-limit is instance-specific in serverless/lambda 
 * environments (e.g., Vercel, AWS Lambda) as each function container execution context is isolated.
 * While this means the rate limits are per-instance and not globally synchronized, this is 
 * acceptable for this project's serverless architecture as it completely avoids external 
 * database lookups or Redis dependencies, ensuring optimal latency, stability, and zero setup costs.
 * 
 * Future Scaling/Migration Path:
 * If traffic requires global synchronization, express-rate-limit can be easily switched to a 
 * distributed store by passing the 'store' property (e.g. rate-limit-redis) without modifying 
 * the route files.
 */

// Parse environment variables once at module startup for optimal performance
const authWindowMs = process.env.RATE_LIMIT_AUTH_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10)
  : 15 * 60 * 1000; // 15 minutes

const authMax = process.env.RATE_LIMIT_AUTH_MAX
  ? parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10)
  : 15;

const otpWindowMs = process.env.RATE_LIMIT_OTP_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_OTP_WINDOW_MS, 10)
  : 15 * 60 * 1000; // 15 minutes

const otpMax = process.env.RATE_LIMIT_OTP_MAX
  ? parseInt(process.env.RATE_LIMIT_OTP_MAX, 10)
  : 5;

const apiWindowMs = process.env.RATE_LIMIT_API_WINDOW_MS
  ? parseInt(process.env.RATE_LIMIT_API_WINDOW_MS, 10)
  : 15 * 60 * 1000; // 15 minutes

const apiMax = process.env.RATE_LIMIT_API_MAX
  ? parseInt(process.env.RATE_LIMIT_API_MAX, 10)
  : 150;

// Reusable single error handler to avoid object allocation per request
const rateLimitHandler = (req, res, next, options) => {
  res.status(429).json({
    success: false,
    message: 'Too many requests. Please try again later.'
  });
};

// authLimiter: Auth endpoints (Login, Register, Google Signin, Password changes)
export const authLimiter = rateLimit({
  windowMs: authWindowMs,
  max: authMax,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// otpLimiter: Strict limits for Otp code delivery endpoint to prevent email spamming
export const otpLimiter = rateLimit({
  windowMs: otpWindowMs,
  max: otpMax,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// apiLimiter: General API CRUD endpoints (Workspaces, Tasks, Goals, Teams, Sprints, Notifications)
export const apiLimiter = rateLimit({
  windowMs: apiWindowMs,
  max: apiMax,
  handler: rateLimitHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

// rateLimiter: Backward compatible fallback function generator
export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

