import express from 'express';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import workspaceRoutes from './routes/workspaces.js';
import goalRoutes from './routes/goals.js';
import teamRoutes from './routes/teams.js';
import scheduleEventRoutes from './routes/scheduleEvents.js';
import notificationsRoutes from './routes/notifications.js';
import workspaceMembersRoutes from './routes/workspaceMembers.js';
import teamMembersRoutes from './routes/teamMembers.js';
import membersRoutes from './routes/members.js';
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

// ─── Compression ──────────────────────────────────────────────────────────
// Compress all responses >1 kB with gzip (brotli in Node 18+).
// Reduces JSON payload sizes by ~70-80% over the wire, cutting network time
// for every API response without any code changes to controllers.
app.use(compression({ level: 6, threshold: 1024 }));
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
  crossOriginOpenerPolicy: { policy: "unsafe-none" }
}));

// Parse Cookie headers for secure HttpOnly cookie auth
app.use(cookieParser());

// Parse JSON request bodies
app.use(express.json());

// API Rate Limiting protection is handled at the router-level to prevent duplicate execution.

// ─── Selective Cache-Control ───────────────────────────────────────────────
// Apply a short stale-while-revalidate cache to read-only GET endpoints.
// This allows browsers and CDN edges to serve cached responses instantly
// while a background revalidation keeps data fresh.
// Auth, notifications, and mutation endpoints are intentionally excluded.
const CACHEABLE_GET_PATHS = [
  '/api/workspaces',
  '/api/v1/workspaces',
  '/api/goals',
  '/api/v1/goals',
  '/api/teams',
  '/api/v1/teams',
  '/api/schedule-events',
  '/api/v1/schedule-events',
];

app.use((req, res, next) => {
  if (req.method === 'GET' && CACHEABLE_GET_PATHS.some(p => req.path.startsWith(p))) {
    // private: don't share between users in a shared CDN cache
    // max-age=10: browser may serve cached response for up to 10 s
    // stale-while-revalidate=30: after 10 s, serve stale while fetching fresh in background
    res.set('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');
  }
  next();
});

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
  app.use(`${routerPath}/workspaces`, workspaceMembersRoutes); // Mounts invitations and member operations under workspaces
  app.use(`${routerPath}/workspace-members`, workspaceMembersRoutes); // Mount alias for workspace-members
  app.use(`${routerPath}/workspaces`, workspaceRoutes);
  app.use(`${routerPath}/goals`, goalRoutes);
  app.use(`${routerPath}/teams`, teamMembersRoutes); // Mounts team details/members under teams
  app.use(`${routerPath}/teams`, teamRoutes);
  app.use(`${routerPath}/schedule-events`, scheduleEventRoutes);
  app.use(`${routerPath}/notifications`, notificationsRoutes);
  app.use(`${routerPath}/members`, membersRoutes);
};

registerRoutes('/api');
registerRoutes('/api/v1');

// Global Centralized Error Handler Middleware
app.use(globalErrorHandler);

// Initialize DB (non-blocking for Vercel serverless functions)
initializeDatabase().catch(err => {
  logger.error('Failed to initialize database connection:', err);
});

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`Jira Clone API Server is running on port ${PORT}`);
  });
}

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

export default app;
