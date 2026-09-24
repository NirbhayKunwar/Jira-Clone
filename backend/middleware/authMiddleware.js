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

// BOLA Prevention: Verify Workspace Access
export const verifyWorkspaceAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Session missing.' });
    }

    const { workspaceId } = req.query;
    const bodyWorkspaceId = req.body.workspaceId;
    const paramWorkspaceId = req.params.workspaceId || req.params.id; // workspace routes use req.params.id

    const rawId = workspaceId || bodyWorkspaceId || paramWorkspaceId;
    
    // If we're hitting workspace create, skip access check
    if (req.method === 'POST' && req.baseUrl === '/api/workspaces' && !paramWorkspaceId) {
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

    const isOwner = Boolean(ws.ownerId && ws.ownerId === req.user.id);
    let isAuthorized = isOwner;

    if (!isAuthorized) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: rawId, userId: req.user.id, status: 'ACTIVE' }
      });
      if (member) {
        isAuthorized = true;
      } else {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (user && user.teamOwnerId && ws.ownerId && user.teamOwnerId === ws.ownerId) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
    }

    req.workspace = ws;
    next();
  } catch (error) {
    next(error);
  }
};

// BOLA Prevention: Verify Goal Access
export const verifyGoalAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Session missing.' });
    }

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

    const isOwner = Boolean(goal.ownerId && goal.ownerId === req.user.id);
    let isAuthorized = isOwner;

    if (!isAuthorized && goal.workspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: goal.workspaceId, userId: req.user.id, status: 'ACTIVE' }
      });
      if (member) isAuthorized = true;
    }

    if (!isAuthorized) {
      return next(new AppError('Forbidden. You do not have access to this goal.', 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

// BOLA Prevention: Verify Team Access
export const verifyTeamAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Session missing.' });
    }

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

    const isOwner = Boolean(team.ownerId && team.ownerId === req.user.id);
    let isAuthorized = isOwner;

    if (!isAuthorized && team.workspaceId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: team.workspaceId, userId: req.user.id, status: 'ACTIVE' }
      });
      if (member) isAuthorized = true;
    }

    if (!isAuthorized) {
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
  if (!req.user.rbacRole && req.user.teamOwnerId !== null && req.user.teamOwnerId !== undefined) {
    return res.status(401).json({ success: false, message: 'Missing role information.' });
  }
  const isOrgOwner = req.user.teamOwnerId === null || req.user.teamOwnerId === undefined;
  const isAdminOrLeader = req.user.rbacRole === 'ADMIN' || req.user.rbacRole === 'LEADER';

  if (!isAdminOrLeader && !isOrgOwner) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};

// RBAC Middleware: Require Workspace Membership
export const requireWorkspaceMember = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Session missing.' });
    }

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

    const isOwner = Boolean(ws.ownerId && ws.ownerId === req.user.id);
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: rawId, userId: req.user.id, status: 'ACTIVE' }
    });
    const isTeamMember = Boolean(req.user.teamOwnerId && ws.ownerId && req.user.teamOwnerId === ws.ownerId);

    if (!isOwner && !member && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this action in this workspace.'
      });
    }

    req.workspace = ws;
    req.workspaceMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

// RBAC Middleware: Require Task Owner or Task Workspace Admin/Owner
export const requireTaskOwnerOrAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Session missing.' });
    }

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

    let isAuthorized = false;
    if (task.assigneeId === req.user.id) {
      isAuthorized = true;
    } else if (task.workspaceId) {
      if (task.workspace && task.workspace.ownerId === req.user.id) {
        isAuthorized = true;
      } else {
        const member = await prisma.workspaceMember.findFirst({
          where: { workspaceId: task.workspaceId, userId: req.user.id, status: 'ACTIVE' }
        });
        if (member && (member.role === 'OWNER' || member.role === 'ADMIN')) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to access or modify this task.'
      });
    }

    req.task = task;
    next();
  } catch (error) {
    next(error);
  }
};

