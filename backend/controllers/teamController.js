import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// Get all teams (scoped to user)
export const getTeams = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized.', 401));
  }

  const teams = await prisma.team.findMany({
    where: { ownerId: userId },
    orderBy: { id: 'desc' }
  });

  const mapped = teams.map(t => {
    let resolvedMembers = [];
    try {
      resolvedMembers = JSON.parse(t.membersText || '[]');
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
  const { name, desc, members } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!name || !name.trim()) {
    return next(new AppError('Team name is required.', 400));
  }

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
    resolvedMembers = JSON.parse(t.membersText);
  } catch (e) {
    resolvedMembers = [];
  }

  const mapped = {
    id: t.id.toString(),
    name: t.name,
    desc: t.descText || '',
    members: resolvedMembers
  };

  return res.status(201).json({ success: true, message: 'Team created successfully.', data: mapped });
});

// Update a team (verify ownership)
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, desc, members } = req.body;

  const teamId = parseInt(id);
  if (isNaN(teamId)) {
    return next(new AppError('Invalid team ID format. Must be an integer.', 400));
  }

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
    resolvedMembers = JSON.parse(t.membersText);
  } catch (e) {
    resolvedMembers = [];
  }

  const mapped = {
    id: t.id.toString(),
    name: t.name,
    desc: t.descText || '',
    members: resolvedMembers
  };

  return res.status(200).json({ success: true, message: 'Team updated successfully.', data: mapped });
});

// Delete a team (verify ownership)
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const teamId = parseInt(id);
  if (isNaN(teamId)) {
    return next(new AppError('Invalid team ID format. Must be an integer.', 400));
  }

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

  return res.status(200).json({ success: true, message: 'Team deleted successfully.' });
});
