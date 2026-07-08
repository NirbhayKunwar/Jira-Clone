import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';

// Get all goals (scoped to user)
export const getGoals = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized.', 401));
  }

  // Get user details to check if they belong to a team - check token cache first!
  let teamOwnerId = req.user ? req.user.teamOwnerId : null;
  if (teamOwnerId === undefined) {
    teamOwnerId = null;
  }

  // Database fallback if token does not have teamOwnerId cached
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
  const { title, desc, owner, targetDate, progress, status } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!title || !title.trim()) {
    return next(new AppError('Goal title is required.', 400));
  }

  const g = await prisma.goal.create({
    data: {
      title: title.trim(),
      descText: desc || '',
      owner: owner || 'You',
      targetDate: targetDate || '',
      progress: progress !== undefined ? parseInt(progress) : 0,
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

  addNotification(`New epic/goal "${g.title}" was created.`, 'goal');

  return res.status(201).json({ success: true, message: 'Goal created successfully.', data: mapped });
});

// Update a goal (verify ownership)
export const updateGoal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { progress, status, title, desc, owner, targetDate } = req.body;

  const goalId = parseInt(id);
  if (isNaN(goalId)) {
    return next(new AppError('Invalid goal ID format. Must be an integer.', 400));
  }

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
  if (progress !== undefined) updateData.progress = parseInt(progress);
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

  addNotification(`Epic/goal "${g.title}" progress updated to ${g.progress}%.`, 'goal');

  return res.status(200).json({ success: true, message: 'Goal updated successfully.', data: mapped });
});

// Delete a goal (verify ownership)
export const deleteGoal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const goalId = parseInt(id);
  if (isNaN(goalId)) {
    return next(new AppError('Invalid goal ID format. Must be an integer.', 400));
  }

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

  addNotification(`Epic/goal "${goalCheck.title}" was deleted.`, 'goal');

  return res.status(200).json({ success: true, message: 'Goal deleted successfully.' });
});
