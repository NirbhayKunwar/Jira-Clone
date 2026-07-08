import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';

const hasWorkspaceAccess = async (workspaceOwnerId, userId) => {
  if (!workspaceOwnerId) return true;
  if (workspaceOwnerId === userId) return true;
  if (!prisma.user || typeof prisma.user.findUnique !== 'function') return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { teamOwnerId: true }
  });
  return user && user.teamOwnerId === workspaceOwnerId;
};

// Get all tasks
export const getTasks = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.query;
  
  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }
  
  const parsedWorkspaceId = parseInt(workspaceId);
  if (isNaN(parsedWorkspaceId)) {
    return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
  }

  // BOLA Authorization Check
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
    assignee: t.assignee ? t.assignee.name : 'You',
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  }));

  return res.status(200).json({ success: true, data: mappedTasks });
});

// Create a new task
export const createTask = asyncHandler(async (req, res, next) => {
  const { title, desc, status, priority, epic, assignee, workspaceId } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError('Task title is required.', 400));
  }

  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }

  const parsedWorkspaceId = parseInt(workspaceId);
  if (isNaN(parsedWorkspaceId)) {
    return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
  }

  // BOLA Authorization Check
  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await hasWorkspaceAccess(ws.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
  }

  let assigneeId = null;
  if (assignee && assignee !== 'You') {
    const user = await prisma.user.findFirst({
      where: { name: assignee }
    });
    if (user) {
      assigneeId = user.id;
    }
  } else if (assignee === 'You' && req.user) {
    assigneeId = req.user.id;
  }

  const t = await prisma.task.create({
    data: {
      title,
      descText: desc || '',
      status: status || 'todo',
      priority: priority || 'Medium',
      epic: epic?.trim() || null,
      assigneeId: assigneeId,
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
    assignee: t.assignee ? t.assignee.name : 'You',
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  };

  console.log(`[TASK SERVICE] Created new task in database via Prisma: ${t.title}`);

  addNotification(`New task "${title}" was created in workspace "${ws.name}".`, 'task');

  return res.status(201).json({ success: true, message: 'Task created successfully.', data: createdTask });
});

// Update a task
export const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, desc, status, priority, epic, assignee, workspaceId } = req.body;

  const taskId = parseInt(id);
  if (isNaN(taskId)) {
    return next(new AppError('Invalid task ID format. Must be an integer.', 400));
  }

  // Retrieve current task to verify workspace owner
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
      const parsedWorkspaceId = parseInt(workspaceId);
      if (isNaN(parsedWorkspaceId)) {
        return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
      }
      // Verify new workspace owner as well
      const wsCheck = await prisma.workspace.findUnique({ where: { id: parsedWorkspaceId } });
      if (!wsCheck || !(await hasWorkspaceAccess(wsCheck.ownerId, req.user.id))) {
        return next(new AppError('Forbidden. You do not have access to target workspace.', 403));
      }
      updateData.workspaceId = parsedWorkspaceId;
    } else {
      updateData.workspaceId = null;
    }
  }

  if (assignee !== undefined) {
    if (assignee && assignee !== 'You') {
      const user = await prisma.user.findFirst({
        where: { name: assignee }
      });
      updateData.assigneeId = user ? user.id : null;
    } else if (assignee === 'You' && req.user) {
      updateData.assigneeId = req.user.id;
    } else {
      updateData.assigneeId = null;
    }
  }

  const t = await prisma.task.update({
    where: { id: taskId },
    data: updateData,
    include: { assignee: true }
  });

  const updatedTask = {
    id: t.id.toString(),
    title: t.title,
    desc: t.descText,
    status: t.status,
    priority: t.priority,
    epic: t.epic,
    assignee: t.assignee ? t.assignee.name : 'You',
    workspaceId: t.workspaceId ? t.workspaceId.toString() : null,
    createdAt: t.createdAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : null
  };

  console.log(`[TASK SERVICE] Updated task ${id} in database via Prisma.`);

  addNotification(`Task "${t.title}" status updated to "${t.status}".`, 'task');

  return res.status(200).json({ success: true, message: 'Task updated successfully.', data: updatedTask });
});

// Delete a task
export const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const taskId = parseInt(id);
  if (isNaN(taskId)) {
    return next(new AppError('Invalid task ID format. Must be an integer.', 400));
  }

  // Retrieve current task to verify workspace owner
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

  console.log(`[TASK SERVICE] Deleted task ${id} from database via Prisma.`);

  addNotification(`Task "${taskCheck.title}" was deleted.`, 'task');

  return res.status(200).json({ success: true, message: 'Task deleted successfully.' });
});
