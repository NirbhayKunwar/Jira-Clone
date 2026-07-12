import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  desc: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  epic: z.string().optional(),
  assignee: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format')
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  desc: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  epic: z.string().optional(),
  assignee: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format').optional()
});

const hasWorkspaceAccess = async (workspaceOwnerId, userId) => {
  if (!workspaceOwnerId) return true;
  if (workspaceOwnerId === userId) return true;
  if (prisma.user && typeof prisma.user.findUnique === 'function') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamOwnerId: true }
    });
    return user && user.teamOwnerId === workspaceOwnerId;
  }
  return false;
};

// Get all tasks
export const getTasks = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.query;
  
  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }
  const parsedWorkspaceId = workspaceId;

  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await hasWorkspaceAccess(ws.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
  }
  
  const tasks = await prisma.task.findMany({
    where: { workspaceId: parsedWorkspaceId },
    include: { assignee: true },
    orderBy: { id: 'asc' }
  });

  const mappedTasks = tasks.map(t => ({
    id: t.id.toString(),
    title: t.title,
    desc: t.descText,
    status: t.status,
    priority: t.priority,
    epic: t.epic,
    assignee: t.assignee ? t.assignee.name : null,
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  }));

  return res.status(200).json({ success: true, data: mappedTasks });
});

// Create a new task
export const createTask = asyncHandler(async (req, res, next) => {
  const body = createTaskSchema.parse(req.body);
  const { title, desc, status, priority, epic, assignee, assigneeId, workspaceId } = body;
  const parsedWorkspaceId = workspaceId;

  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await hasWorkspaceAccess(ws.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
  }

  let targetAssigneeId = null;
  const inputAssignee = assigneeId !== undefined ? assigneeId : assignee;

  if (inputAssignee) {
    if (/^[0-9a-fA-F]{24}$/.test(inputAssignee)) {
      if (prisma.user && typeof prisma.user.findUnique === 'function') {
        const user = await prisma.user.findUnique({ where: { id: inputAssignee } });
        if (!user) {
          return next(new AppError('Assignee user not found.', 404));
        }
        targetAssigneeId = user.id;
      }
    } else if (inputAssignee === 'You' && req.user) {
      targetAssigneeId = req.user.id;
    } else {
      if (prisma.user && typeof prisma.user.findFirst === 'function') {
        const user = await prisma.user.findFirst({ where: { name: inputAssignee } });
        targetAssigneeId = user ? user.id : null;
      }
    }
  }

  const t = await prisma.task.create({
    data: {
      title,
      descText: desc || '',
      status: status || 'todo',
      priority: priority || 'Medium',
      epic: epic?.trim() || null,
      assigneeId: targetAssigneeId,
      workspaceId: parsedWorkspaceId,
      completedAt: (status || 'todo') === 'done' ? new Date() : null
    },
    include: { assignee: true }
  });

  const createdTask = {
    id: t.id.toString(),
    title: t.title,
    desc: t.descText,
    status: t.status,
    priority: t.priority,
    epic: t.epic,
    assignee: t.assignee ? t.assignee.name : null,
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  };

  logger.info(`[TASK SERVICE] Created new task in database via Prisma: ${t.title}`);

  await addNotification(`New task "${title}" was created in workspace "${ws.name}".`, 'task', req.user.id);

  return res.status(201).json({ success: true, message: 'Task created successfully.', data: createdTask });
});

// Update a task
export const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const body = updateTaskSchema.parse(req.body);
  const { title, desc, status, priority, epic, assignee, assigneeId, workspaceId } = body;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid task ID format.', 400));
  }
  const taskId = id;

  const taskCheck = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workspace: true }
  });

  if (!taskCheck) {
    return next(new AppError('Task not found.', 404));
  }

  if (taskCheck.workspace && !(await hasWorkspaceAccess(taskCheck.workspace.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this task.', 403));
  }

  // Enforce member assignment restrictions
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized. No user information.', data: null });
  }
  if (!req.user.rbacRole) {
    return res.status(401).json({ success: false, message: 'Missing role information.', data: null });
  }
  const isAdminOrLeader = req.user.rbacRole === 'ADMIN' || req.user.rbacRole === 'LEADER';
  if (!isAdminOrLeader && (assigneeId !== undefined || assignee !== undefined)) {
    return next(new AppError('You do not have permission to assign tasks.', 403));
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (desc !== undefined) updateData.descText = desc;
  if (status !== undefined) {
    updateData.status = status;
    updateData.completedAt = status === 'done' ? new Date() : null;
  }
  if (priority !== undefined) updateData.priority = priority;
  if (epic !== undefined) updateData.epic = epic;
  
  if (workspaceId !== undefined) {
    if (workspaceId) {
      const wsCheck = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!wsCheck || !(await hasWorkspaceAccess(wsCheck.ownerId, req.user.id))) {
        return next(new AppError('Forbidden. You do not have access to target workspace.', 403));
      }
      updateData.workspaceId = workspaceId;
    } else {
      updateData.workspaceId = null;
    }
  }

  if (assigneeId !== undefined || assignee !== undefined) {
    const inputAssignee = assigneeId !== undefined ? assigneeId : assignee;
    if (inputAssignee) {
      if (/^[0-9a-fA-F]{24}$/.test(inputAssignee)) {
        if (prisma.user && typeof prisma.user.findUnique === 'function') {
          const user = await prisma.user.findUnique({ where: { id: inputAssignee } });
          if (!user) {
            return next(new AppError('Assignee user not found.', 404));
          }
          updateData.assigneeId = user.id;
        }
      } else if (inputAssignee === 'You' && req.user) {
        updateData.assigneeId = req.user.id;
      } else {
        if (prisma.user && typeof prisma.user.findFirst === 'function') {
          const user = await prisma.user.findFirst({ where: { name: inputAssignee } });
          updateData.assigneeId = user ? user.id : null;
        }
      }
    } else {
      updateData.assigneeId = null;
    }
  }

  const result = await prisma.task.updateMany({
    where: {
      id: taskId,
      createdAt: taskCheck.createdAt
    },
    data: updateData
  });

  if (result.count === 0) {
    return next(new AppError('Conflict: Task was modified by another request. Please refresh and try again.', 409));
  }

  const t = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignee: true }
  });

  const updatedTask = {
    id: t.id.toString(),
    title: t.title,
    desc: t.descText,
    status: t.status,
    priority: t.priority,
    epic: t.epic,
    assignee: t.assignee ? t.assignee.name : null,
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  };

  logger.info(`[TASK SERVICE] Updated task ${id} in database via OCC.`);

  await addNotification(`Task "${t.title}" status updated to "${t.status}".`, 'task', req.user.id);

  return res.status(200).json({ success: true, message: 'Task updated successfully.', data: updatedTask });
});

// Delete a task
export const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid task ID format.', 400));
  }
  const taskId = id;

  const taskCheck = await prisma.task.findUnique({
    where: { id: taskId },
    include: { workspace: true }
  });

  if (!taskCheck) {
    return next(new AppError('Task not found.', 404));
  }

  if (taskCheck.workspace && !(await hasWorkspaceAccess(taskCheck.workspace.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this task.', 403));
  }

  await prisma.task.delete({
    where: { id: taskId }
  });

  logger.info(`[TASK SERVICE] Deleted task ${id} from database via Prisma.`);

  await addNotification(`Task "${taskCheck.title}" was deleted.`, 'task', req.user.id);

  return res.status(200).json({ success: true, message: 'Task deleted successfully.', data: null });
});

// Claim an unassigned task (Members only)
export const claimTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid task ID format.', 400));
  }

  // Atomically claim task inside a transaction to prevent race conditions
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!task) {
      throw new AppError('Task not found.', 404);
    }

    const ws = task.workspace;
    if (!ws) {
      throw new AppError('Workspace not found.', 404);
    }

    const hasAccess = await hasWorkspaceAccess(ws.ownerId, userId);
    if (!hasAccess) {
      throw new AppError('Forbidden. You do not belong to this workspace.', 403);
    }

    if (!req.user.rbacRole) {
      throw new AppError('Missing role information.', 401);
    }
    if (req.user.rbacRole !== 'MEMBER') {
      throw new AppError('Only Team Members can claim tasks.', 403);
    }

    if (task.assigneeId !== null) {
      throw new AppError('Task already claimed.', 409);
    }

    const updatedTask = await tx.task.update({
      where: { id },
      data: { assigneeId: userId },
      include: { assignee: true }
    });

    return updatedTask;
  });

  const mappedTask = {
    id: result.id.toString(),
    title: result.title,
    desc: result.descText,
    status: result.status,
    priority: result.priority,
    epic: result.epic,
    assignee: result.assignee ? result.assignee.name : null,
    workspaceId: result.workspaceId ? result.workspaceId.toString() : null,
    createdAt: result.createdAt.toISOString(),
    completedAt: result.completedAt ? result.completedAt.toISOString() : null
  };

  logger.info(`[TASK SERVICE] Task ${id} claimed successfully by member ${userId}.`);

  await addNotification(`Task "${result.title}" claimed by member ${req.user.name}.`, 'task', req.user.id);

  return res.status(200).json({ success: true, message: 'Task claimed successfully.', data: mappedTask });
});


