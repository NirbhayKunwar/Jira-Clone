import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

let redis = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('[REDIS] Upstash Redis client initialized successfully.');
  } catch (error) {
    logger.error('[REDIS] Failed to initialize Upstash Redis client:', error);
  }
} else {
  logger.warn('[REDIS] Upstash Redis credentials not found. Rate limiting will fall back to local in-memory storage.');
}

export default redis;
