import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
};

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // Read token from secure HttpOnly cookies or Authorization header
  const token = req.cookies?.jira_token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// BOLA Prevention: Verify Workspace Ownership
export const verifyWorkspaceAccess = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    const bodyWorkspaceId = req.body.workspaceId;
    const paramWorkspaceId = req.params.workspaceId || req.params.id; // workspace routes use req.params.id

    const rawId = workspaceId || bodyWorkspaceId || paramWorkspaceId;
    
    // If we're hitting workspace create, skip access check
    if (req.method === 'POST' && req.baseUrl === '/api/workspaces') {
      return next();
    }

    if (!rawId) {
      return next();
    }

    const parsedId = parseInt(rawId);
    if (isNaN(parsedId)) {
      return next(new AppError('Invalid workspace ID format.', 400));
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: parsedId }
    });

    if (!ws) {
      return next(new AppError('Workspace not found.', 404));
    }

    if (ws.ownerId && ws.ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// BOLA Prevention: Verify Goal Ownership
export const verifyGoalAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next();

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return next(new AppError('Invalid goal ID format.', 400));
    }

    const goal = await prisma.goal.findUnique({
      where: { id: parsedId }
    });

    if (!goal) {
      return next(new AppError('Goal not found.', 404));
    }

    if (goal.ownerId && goal.ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this goal.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// BOLA Prevention: Verify Team Ownership
export const verifyTeamAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) return next();

    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
      return next(new AppError('Invalid team ID format.', 400));
    }

    const team = await prisma.team.findUnique({
      where: { id: parsedId }
    });

    if (!team) {
      return next(new AppError('Team not found.', 404));
    }

    if (team.ownerId && team.ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this team.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
