import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';

export const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
};

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  // Read token from secure HttpOnly cookies or Authorization header
  const token = req.cookies?.jira_token || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { tokenVersion: true, rbacRole: true, teamOwnerId: true }
    });

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired or password changed. Please log in again.' });
    }

    req.user = {
      ...decoded,
      rbacRole: user.rbacRole,
      teamOwnerId: user.teamOwnerId
    };

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
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

    if (!isValidObjectId(rawId)) {
      return next(new AppError('Invalid workspace ID format.', 400));
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: rawId }
    });

    if (!ws) {
      return next(new AppError('Workspace not found.', 404));
    }

    if (ws.ownerId && ws.ownerId !== req.user.id) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: rawId, userId: req.user.id, status: 'ACTIVE' }
      });
      if (!member) {
        // Also allow if user is owner of team or has active user session in organization
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        const isTeamMember = user && (user.teamOwnerId === ws.ownerId || user.rbacRole === 'ADMIN' || user.rbacRole === 'LEADER');
        if (!isTeamMember) {
          return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
        }
      }
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

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid goal ID format.', 400));
    }

    const goal = await prisma.goal.findUnique({
      where: { id }
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

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid team ID format.', 400));
    }

    const team = await prisma.team.findUnique({
      where: { id }
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

// RBAC Middleware: Require Admin or Team Leader
export const requireAdminOrLeader = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. No user information.' });
  }
  if (!req.user.rbacRole) {
    return res.status(401).json({ success: false, message: 'Missing role information.' });
  }
  if (req.user.rbacRole !== 'ADMIN' && req.user.rbacRole !== 'LEADER') {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};

// RBAC Middleware: Require Workspace Membership
export const requireWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    const bodyWorkspaceId = req.body.workspaceId;
    const paramWorkspaceId = req.params.workspaceId || req.params.id;
    const rawId = workspaceId || bodyWorkspaceId || paramWorkspaceId;

    if (!rawId) {
      return res.status(400).json({ success: false, message: 'Workspace ID is required.' });
    }

    if (!isValidObjectId(rawId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace ID format.' });
    }

    const ws = await prisma.workspace.findUnique({ where: { id: rawId } });
    if (!ws) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const isOwner = ws.ownerId === req.user.id;
    const isTeamMember = req.user.teamOwnerId && ws.ownerId === req.user.teamOwnerId;

    if (!isOwner && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }

    req.workspace = ws;
    next();
  } catch (error) {
    next(error);
  }
};

// RBAC Middleware: Require Task Owner or Admin/Leader
export const requireTaskOwnerOrAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Task ID is required.' });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID format.' });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const isAdminOrLeader = req.user.rbacRole === 'ADMIN' || req.user.rbacRole === 'LEADER';
    const isAssignedToMe = task.assigneeId === req.user.id;

    if (!isAdminOrLeader && !isAssignedToMe) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }

    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

