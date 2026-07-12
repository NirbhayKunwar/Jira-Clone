import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  desc: z.string().optional(),
  members: z.array(z.string()).optional()
});

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional(),
  members: z.array(z.string()).optional()
});

// Get all teams (scoped to user)
export const getTeams = asyncHandler(async (req, res, next) => {
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

  const teams = await prisma.team.findMany({
    where: { ownerId: { in: ownerIds } },
    orderBy: { id: 'desc' }
  });

  const mapped = teams.map(t => {
    let resolvedMembers = [];
    try {
      resolvedMembers = JSON.parse(t.membersText || '[]').map(String);
    } catch (e) {
      resolvedMembers = [];
    }
    return {
      id: t.id.toString(),
      name: t.name,
      desc: t.descText || '',
      members: resolvedMembers
    };
  });

  return res.status(200).json({ success: true, data: mapped });
});

// Create a team (linked to owner)
export const createTeam = asyncHandler(async (req, res, next) => {
  const body = createTeamSchema.parse(req.body);
  const { name, desc, members } = body;
  const userId = req.user ? req.user.id : null;

  const t = await prisma.team.create({
    data: {
      name: name.trim(),
      descText: desc || '',
      membersText: JSON.stringify(members || []),
      ownerId: userId
    }
  });

  let resolvedMembers = [];
  try {
    resolvedMembers = JSON.parse(t.membersText).map(String);
  } catch (e) {
    resolvedMembers = [];
  }

  const mapped = {
    id: t.id.toString(),
    name: t.name,
    desc: t.descText || '',
    members: resolvedMembers
  };

  logger.info(`[TEAM SERVICE] Created new team: ${t.name}`);

  await addNotification(`Custom team "${name.trim()}" was created.`, 'team', req.user.id);

  return res.status(201).json({ success: true, message: 'Team created successfully.', data: mapped });
});

// Update a team (verify ownership)
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const body = updateTeamSchema.parse(req.body);
  const { name, desc, members } = body;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid team ID format.', 400));
  }
  const teamId = id;

  const teamCheck = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!teamCheck) {
    return next(new AppError('Team not found.', 404));
  }

  if (teamCheck.ownerId && teamCheck.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this team.', 403));
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (desc !== undefined) updateData.descText = desc;
  if (members !== undefined) updateData.membersText = JSON.stringify(members);

  const t = await prisma.team.update({
    where: { id: teamId },
    data: updateData
  });

  let resolvedMembers = [];
  try {
    resolvedMembers = JSON.parse(t.membersText).map(String);
  } catch (e) {
    resolvedMembers = [];
  }

  const mapped = {
    id: t.id.toString(),
    name: t.name,
    desc: t.descText || '',
    members: resolvedMembers
  };

  logger.info(`[TEAM SERVICE] Updated team details for: ${t.name}`);

  await addNotification(`Custom team "${name ? name.trim() : teamCheck.name}" details were updated.`, 'team', req.user.id);

  return res.status(200).json({ success: true, message: 'Team updated successfully.', data: mapped });
});

// Delete a team (verify ownership)
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid team ID format.', 400));
  }
  const teamId = id;

  const teamCheck = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!teamCheck) {
    return next(new AppError('Team not found.', 404));
  }

  if (teamCheck.ownerId && teamCheck.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this team.', 403));
  }

  await prisma.team.delete({
    where: { id: teamId }
  });

  logger.info(`[TEAM SERVICE] Deleted team: ${teamCheck.name}`);

  await addNotification(`Custom team "${teamCheck.name}" was deleted.`, 'team', req.user.id);

  return res.status(200).json({ success: true, message: 'Team deleted successfully.', data: null });
});


