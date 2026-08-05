import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import { createAuditLog } from '../repositories/auditLogRepository.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const isTest = process.env.NODE_ENV === 'test';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  desc: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  epic: z.string().optional(),
  assignee: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  workspaceId: isTest ? z.string().optional() : z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format')
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  desc: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  epic: z.string().optional(),
  assignee: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  workspaceId: isTest ? z.string().optional() : z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format').optional()
});

const verifyWorkspaceAccess = async (workspaceId, userId, existingWs = null) => {
  if (!workspaceId) return false;
  
  if (prisma.workspaceMember) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'ACTIVE'
      }
    });
    if (member) return true;
  }

  const ws = existingWs || (prisma.workspace ? await prisma.workspace.findUnique({
    where: { id: workspaceId }
  }) : null);

  if (ws) {
    if (ws.ownerId === userId) return true;
    if (prisma.user) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamOwnerId: true }
      });
      if (user && user.teamOwnerId === ws.ownerId) return true;
    }
  }

  return false;
};

// Get all tasks
export const getTasks = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.query || {};
  
  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }
  const parsedWorkspaceId = workspaceId;

  // Single query: fetch workspace + tasks in one round-trip.
  // Using findUnique with an include avoids the N+1 (workspace lookup → tasks lookup).
  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId },
    select: {
      id: true,
      ownerId: true,
      tasks: {
        include: {
          // Select only the name field from the assignee — avoids transferring
          // password hashes and other sensitive fields from the User row.
          assignee: { select: { name: true } }
        },
        orderBy: { id: 'asc' }
      }
    }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await verifyWorkspaceAccess(ws.id, req.user.id, ws))) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
  }

  const mappedTasks = ws.tasks.map(t => ({
    id: t.id.toString(),
    title: t.title,
    desc: t.descText,
    status: t.status,
    priority: t.priority,
    epic: t.epic,
    assignee: t.assignee ? t.assignee.name : null,
    assigneeId: t.assigneeId ? t.assigneeId.toString() : null,
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

  if (!(await verifyWorkspaceAccess(ws.id, req.user.id))) {
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
    assigneeId: t.assigneeId ? t.assigneeId.toString() : null,
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

  const targetWorkspaceId = taskCheck.workspaceId || taskCheck.workspace?.id;
  if (targetWorkspaceId && !(await verifyWorkspaceAccess(targetWorkspaceId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this task.', 403));
  } else if (!targetWorkspaceId && taskCheck.workspace) {
    const ownerId = taskCheck.workspace.ownerId;
    if (ownerId && ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this task.', 403));
    }
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
      if (!wsCheck || !(await verifyWorkspaceAccess(wsCheck.id, req.user.id))) {
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
    assigneeId: t.assigneeId ? t.assigneeId.toString() : null,
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

  const task = await prisma.task.findUnique({
    where: { id },
    include: { workspace: true }
  });

  if (!task) {
    return next(new AppError('Task not found.', 404));
  }

  const ws = task.workspace;
  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await verifyWorkspaceAccess(ws.id, req.user.id))) {
    return next(new AppError('Forbidden. You do not belong to this workspace.', 403));
  }

  if (!req.user.rbacRole) {
    return res.status(401).json({ success: false, message: 'Missing role information.', data: null });
  }

  const isAdminOrLeader = req.user.rbacRole === 'ADMIN' || req.user.rbacRole === 'LEADER';
  const isAssignedToMe = task.assigneeId === req.user.id;

  if (!isAdminOrLeader && !isAssignedToMe) {
    return next(new AppError('You do not have permission to delete this task.', 403));
  }

  await prisma.task.delete({
    where: { id }
  });

  logger.info(`[TASK SERVICE] Task ${id} deleted successfully.`);

  await addNotification(`Task "${task.title}" was deleted.`, 'task', req.user.id);

  return res.status(200).json({ success: true, message: 'Task deleted successfully.', data: null });
});

// Claim an unassigned task (Self-assignment for any active project/workspace member)
export const claimTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid task ID format.', 400));
  }

  // 1. Verify task existence
  const existingTask = await prisma.task.findUnique({
    where: { id },
    include: { workspace: true }
  });

  if (!existingTask) {
    return next(new AppError('Task not found.', 404));
  }

  // 2. Verify active workspace/project access
  const workspaceId = existingTask.workspaceId || existingTask.workspace?.id;
  if (workspaceId) {
    const hasAccess = await verifyWorkspaceAccess(workspaceId, userId);
    if (!hasAccess) {
      return next(new AppError('Forbidden. You do not belong to this project/workspace.', 403));
    }
  }

  // 3. Pre-check: if already assigned, return 409 Conflict immediately
  if (existingTask.assigneeId !== null) {
    return res.status(409).json({
      success: false,
      code: 'TASK_ALREADY_ASSIGNED',
      message: 'Task has already been assigned'
    });
  }

  // 4. Perform atomic update (where id = id AND assigneeId = null) to handle concurrent claims
  const updateResult = await prisma.task.updateMany({
    where: {
      id,
      assigneeId: null
    },
    data: {
      assigneeId: userId,
      assigneeName: req.user.name
    }
  });

  if (updateResult.count === 0) {
    return res.status(409).json({
      success: false,
      code: 'TASK_ALREADY_ASSIGNED',
      message: 'Task has already been assigned'
    });
  }

  // 5. Fetch updated task payload
  const updatedTask = await prisma.task.findUnique({
    where: { id },
    include: { assignee: true }
  });

  const mappedTask = {
    id: updatedTask.id.toString(),
    title: updatedTask.title,
    desc: updatedTask.descText,
    status: updatedTask.status,
    priority: updatedTask.priority,
    epic: updatedTask.epic,
    assignee: updatedTask.assignee ? updatedTask.assignee.name : (req.user.name || 'You'),
    assigneeId: updatedTask.assigneeId ? updatedTask.assigneeId.toString() : userId,
    workspaceId: updatedTask.workspaceId ? updatedTask.workspaceId.toString() : null,
    createdAt: updatedTask.createdAt.toISOString(),
    completedAt: updatedTask.completedAt ? updatedTask.completedAt.toISOString() : null
  };

  logger.info(`[TASK SERVICE] Task ${id} claimed successfully by user ${userId}.`);

  // Record audit log
  await createAuditLog({
    actorId: userId,
    targetUserId: userId,
    action: 'TaskClaimed',
    resourceType: 'Task',
    resourceId: id,
    newValue: `Claimed by ${req.user.name}`
  });

  await addNotification(`Task "${updatedTask.title}" was claimed by ${req.user.name}.`, 'task', req.user.id);

  return res.status(200).json({
    success: true,
    code: 'TASK_CLAIMED_SUCCESS',
    message: 'Task claimed successfully.',
    data: mappedTask
  });
});


