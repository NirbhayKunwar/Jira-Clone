import redis from '../config/redis.js';
import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  // Read config from env if available
  const envWindowMs = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : windowMs;
  const envMaxRequests = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : maxRequests;

  if (redis) {
    return async (req, res, next) => {
      try {
        const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const key = `ratelimit:${ip}:${req.baseUrl || req.path}`;
        
        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, Math.ceil(envWindowMs / 1000));
        }

        if (count > envMaxRequests) {
          logger.warn(`[RATE LIMIT] IP ${ip} exceeded limit of ${envMaxRequests} requests on ${req.baseUrl || req.path}`);
          return res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.',
            data: null,
            error: { code: 'RATE_LIMIT_EXCEEDED' }
          });
        }

        next();
      } catch (error) {
        logger.error('[RATE LIMIT ERROR] Fallback to next middleware:', error);
        next();
      }
    };
  }

  // Fallback to local memory limiter
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

