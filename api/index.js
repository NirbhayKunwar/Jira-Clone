import app from '../backend/server.js';

export default async function handler(req, res) {
  try {
    return app(req, res);
  } catch (err) {
    console.error('[VERCEL SERVERLESS HANDLER CRASH]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        code: 'VERCEL_SERVERLESS_CRASH'
      });
    }
  }
}
