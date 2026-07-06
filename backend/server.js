import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import workspaceRoutes from './routes/workspaces.js';
import goalRoutes from './routes/goals.js';
import teamRoutes from './routes/teams.js';
import scheduleEventRoutes from './routes/scheduleEvents.js';
import { initializeDatabase } from './config/db.js';
import { globalErrorHandler } from './middleware/errorHandler.js';
import prisma from './config/prisma.js';
import logger from './config/logger.js';

// Load environment variables
dotenv.config();

// Fail Fast Startup check: Validate all required environment variables
const requiredEnv = ['DATABASE_URL', 'JWT_SECRET'];
for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Enable CORS with whitelist configuration
const parseOrigins = (value = '') => value
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const clientOrigins = [
  ...parseOrigins(process.env.CLIENT_URL),
  ...parseOrigins(process.env.FRONTEND_URL),
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);
const corsWhitelist = [...new Set(clientOrigins)];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowedOrigin = corsWhitelist.includes(origin);
    let isAllowedVercelPreview = false;

    try {
      isAllowedVercelPreview = process.env.NODE_ENV === 'production'
        && /\.vercel\.app$/.test(new URL(origin).hostname);
    } catch {
      isAllowedVercelPreview = false;
    }

    if (isAllowedOrigin || isAllowedVercelPreview || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// Parse Cookie headers for secure HttpOnly cookie auth
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// API Rate Limiting protection
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many authentication attempts, please try again after 15 minutes.' }
});

app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/v1/auth', authLimiter);

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'System is healthy', uptime: process.uptime() });
});
app.get('/live', (req, res) => {
  res.status(200).json({ success: true, message: 'Live' });
});
app.get('/ready', (req, res) => {
  res.status(200).json({ success: true, message: 'Ready' });
});

// Mount Routes (Mount both standard and v1 paths for backward compatibility)
const registerRoutes = (routerPath) => {
  app.use(`${routerPath}/auth`, authRoutes);
  app.use(`${routerPath}/tasks`, taskRoutes);
  app.use(`${routerPath}/workspaces`, workspaceRoutes);
  app.use(`${routerPath}/goals`, goalRoutes);
  app.use(`${routerPath}/teams`, teamRoutes);
  app.use(`${routerPath}/schedule-events`, scheduleEventRoutes);
};

registerRoutes('/api');
registerRoutes('/api/v1');

// Global Centralized Error Handler Middleware
app.use(globalErrorHandler);

// Initialize DB and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    logger.info(`Jira Clone API Server is running on port ${PORT}`);
  });
}).catch(err => {
  logger.error('Failed to initialize database:', err);
  process.exit(1);
});

// Intercept exit signals to perform clean shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`[SHUTDOWN] Received signal ${signal}. Starting graceful shutdown...`);
  try {
    await prisma.$disconnect();
    logger.info('[SHUTDOWN] Database connection pool cleanly closed.');
    process.exit(0);
  } catch (err) {
    logger.error('[SHUTDOWN] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
