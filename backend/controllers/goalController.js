import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const createGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  desc: z.string().optional(),
  owner: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val).optional(),
  status: z.string().optional()
});

const updateGoalSchema = z.object({
  title: z.string().min(1).optional(),
  desc: z.string().optional(),
  owner: z.string().optional(),
  targetDate: z.string().optional(),
  progress: z.union([z.number(), z.string()]).transform(val => typeof val === 'string' ? parseInt(val) : val).optional(),
  status: z.string().optional()
});

// Get all goals (scoped to user)
export const getGoals = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized.', 401));
  }

  let teamOwnerId = req.user ? req.user.teamOwnerId : null;
  if (teamOwnerId === undefined) {
    teamOwnerId = null;
  }

  if (teamOwnerId === null && prisma.user && typeof prisma.user.findUnique === 'function') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamOwnerId: true }
    });
    if (user) {
      teamOwnerId = user.teamOwnerId;
    }
  }

  const ownerIds = [userId];
  if (teamOwnerId) {
    ownerIds.push(teamOwnerId);
  }

  const goals = await prisma.goal.findMany({
    where: { ownerId: { in: ownerIds } },
    orderBy: { id: 'desc' }
  });

  const mapped = goals.map(g => ({
    id: g.id.toString(),
    title: g.title,
    desc: g.descText || '',
    owner: g.owner,
    targetDate: g.targetDate || '',
    progress: g.progress,
    status: g.status
  }));

  return res.status(200).json({ success: true, data: mapped });
});

// Create a goal (linked to user)
export const createGoal = asyncHandler(async (req, res, next) => {
  const body = createGoalSchema.parse(req.body);
  const { title, desc, owner, targetDate, progress, status } = body;
  const userId = req.user ? req.user.id : null;

  const g = await prisma.goal.create({
    data: {
      title: title.trim(),
      descText: desc || '',
      owner: owner || 'You',
      targetDate: targetDate || '',
      progress: progress || 0,
      status: status || 'on_track',
      ownerId: userId
    }
  });

  const mapped = {
    id: g.id.toString(),
    title: g.title,
    desc: g.descText || '',
    owner: g.owner,
    targetDate: g.targetDate || '',
    progress: g.progress,
    status: g.status
  };

  logger.info(`[GOAL SERVICE] Created new goal: ${g.title}`);

  await addNotification(`New epic/goal "${g.title}" was created.`, 'goal', req.user.id);

  return res.status(201).json({ success: true, message: 'Goal created successfully.', data: mapped });
});

// Update a goal (verify ownership)
export const updateGoal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const body = updateGoalSchema.parse(req.body);
  const { progress, status, title, desc, owner, targetDate } = body;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid goal ID format.', 400));
  }
  const goalId = id;

  const goalCheck = await prisma.goal.findUnique({
    where: { id: goalId }
  });

  if (!goalCheck) {
    return next(new AppError('Goal not found.', 404));
  }

  if (goalCheck.ownerId && goalCheck.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this goal.', 403));
  }

  const updateData = {};
  if (progress !== undefined) updateData.progress = progress;
  if (status !== undefined) updateData.status = status;
  if (title !== undefined) updateData.title = title;
  if (desc !== undefined) updateData.descText = desc;
  if (owner !== undefined) updateData.owner = owner;
  if (targetDate !== undefined) updateData.targetDate = targetDate;

  const g = await prisma.goal.update({
    where: { id: goalId },
    data: updateData
  });

  const mapped = {
    id: g.id.toString(),
    title: g.title,
    desc: g.descText || '',
    owner: g.owner,
    targetDate: g.targetDate || '',
    progress: g.progress,
    status: g.status
  };

  logger.info(`[GOAL SERVICE] Updated goal progress for: ${g.title}`);

  await addNotification(`Epic/goal "${g.title}" progress updated to ${g.progress}%.`, 'goal', req.user.id);

  return res.status(200).json({ success: true, message: 'Goal updated successfully.', data: mapped });
});

// Delete a goal (verify ownership)
export const deleteGoal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid goal ID format.', 400));
  }
  const goalId = id;

  const goalCheck = await prisma.goal.findUnique({
    where: { id: goalId }
  });

  if (!goalCheck) {
    return next(new AppError('Goal not found.', 404));
  }

  if (goalCheck.ownerId && goalCheck.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this goal.', 403));
  }

  await prisma.goal.delete({
    where: { id: goalId }
  });

  logger.info(`[GOAL SERVICE] Deleted goal: ${goalCheck.title}`);

  await addNotification(`Epic/goal "${goalCheck.title}" was deleted.`, 'goal', req.user.id);

  return res.status(200).json({ success: true, message: 'Goal deleted successfully.', data: null });
});


