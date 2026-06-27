import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import workspaceRoutes from './routes/workspaces.js';
import goalRoutes from './routes/goals.js';
import teamRoutes from './routes/teams.js';
import { initializeDatabase } from './config/db.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS
app.use(cors());

// Configure JSON body parser
app.use(express.json());

// API Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Jira Clone API Server',
    endpoints: {
      health: 'GET /',
      signup: 'POST /api/auth/signup',
      signin: 'POST /api/auth/signin',
      signout: 'POST /api/auth/signout'
    }
  });
});

// Mount Authentication Routes
app.use('/api/auth', authRoutes);

// Mount Task CRUD Routes
app.use('/api/tasks', taskRoutes);

// Mount Workspace Routes
app.use('/api/workspaces', workspaceRoutes);

// Mount Goals & Teams Routes
app.use('/api/goals', goalRoutes);
app.use('/api/teams', teamRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

// Start Server after Database Initialization
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Jira Clone API Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Exiting server startup...', err);
    process.exit(1);
  });
