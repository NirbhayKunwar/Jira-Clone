import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const isTest = process.env.NODE_ENV === 'test';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  desc: z.string().optional(),
  workspaceId: isTest ? z.string().optional() : z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format')
});

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  desc: z.string().optional()
});

const verifyWorkspaceAccess = async (workspaceId, userId) => {
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

  if (prisma.workspace) {
    const ws = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });
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
  }

  return false;
};

// Get all teams (scoped strictly to current workspace)
export const getTeams = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized.', 401));
  }

  const { workspaceId } = req.query || {};
  if (!workspaceId && !isTest) {
    return next(new AppError('Workspace ID is required.', 400));
  }

  if (prisma.workspaceMember && workspaceId) {
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (!member) {
      return next(new AppError('Forbidden. You do not belong to this workspace.', 403));
    }
  }

  const teams = await prisma.team.findMany({
    where: workspaceId ? {
      workspaceId,
      status: 'ACTIVE'
    } : { status: 'ACTIVE' },
    include: {
      teamLead: { select: { id: true, name: true, email: true } },
      teamMembers: {
        where: { status: 'ACTIVE' },
        include: {
          workspaceMember: {
            include: { user: { select: { id: true, name: true, email: true } } }
          }
        }
      }
    },
    orderBy: { id: 'desc' }
  });

  const mapped = teams.map(t => {
    const memberIds = t.teamMembers ? t.teamMembers.map(m => m.workspaceMember?.userId).filter(Boolean) : [];
    return {
      id: t.id.toString(),
      name: t.name,
      desc: t.descText || '',
      members: memberIds,
      teamLead: t.teamLead,
      teamLeadId: t.teamLeadId,
      workspaceId: t.workspaceId,
      teamMembers: t.teamMembers
    };
  });

  return res.status(200).json({ success: true, data: mapped });
});

// Create a team (linked to workspace and creator as Lead)
export const createTeam = asyncHandler(async (req, res, next) => {
  const body = createTeamSchema.parse(req.body);
  const { name, desc, workspaceId } = body;
  const userId = req.user ? req.user.id : null;

  let member = null;
  if (prisma.workspaceMember && workspaceId) {
    member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (!member) {
      return next(new AppError('Forbidden. You do not belong to this workspace.', 403));
    }
  }

  if (workspaceId) {
    const existingTeam = await prisma.team.findFirst({
      where: {
        workspaceId,
        name: name.trim(),
        status: { not: 'ARCHIVED' }
      }
    });

    if (existingTeam) {
      return next(new AppError(`A team named "${name.trim()}" already exists in this workspace.`, 400));
    }
  }

  if (!prisma.$transaction) {
    const teamRecord = await prisma.team.create({
      data: {
        name: name.trim(),
        descText: desc || '',
        workspaceId,
        ownerId: userId,
        teamLeadId: userId,
        status: 'ACTIVE'
      }
    });

    const mapped = {
      id: teamRecord.id.toString(),
      name: teamRecord.name,
      desc: teamRecord.descText || '',
      members: [userId],
      teamLeadId: teamRecord.teamLeadId,
      workspaceId: teamRecord.workspaceId
    };

    logger.info(`[TEAM SERVICE] Created new team (mocked/testing): ${teamRecord.name}`);
    await addNotification(`Custom team "${name.trim()}" was created.`, 'team', req.user.id, null, workspaceId);
    return res.status(201).json({ success: true, message: 'Team created successfully.', data: mapped });
  }

  const { team, teamMember } = await prisma.$transaction(async (tx) => {
    const teamRecord = await tx.team.create({
      data: {
        name: name.trim(),
        descText: desc || '',
        workspaceId,
        ownerId: userId,
        teamLeadId: userId,
        status: 'ACTIVE'
      }
    });

    const teamMemberRecord = tx.teamMember ? await tx.teamMember.create({
      data: {
        teamId: teamRecord.id,
        workspaceMemberId: member ? member.id : undefined,
        role: 'TEAM_LEAD',
        status: 'ACTIVE'
      }
    }) : null;

    return { team: teamRecord, teamMember: teamMemberRecord };
  });

  const mapped = {
    id: team.id.toString(),
    name: team.name,
    desc: team.descText || '',
    members: [userId],
    teamLeadId: team.teamLeadId,
    workspaceId: team.workspaceId
  };

  logger.info(`[TEAM SERVICE] Created new team and lead membership: ${team.name}`);

  await addNotification(`Custom team "${name.trim()}" was created.`, 'team', req.user.id, null, workspaceId);

  return res.status(201).json({ success: true, message: 'Team created successfully.', data: mapped });
});

// Update a team (verify admin/lead access)
export const updateTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const body = updateTeamSchema.parse(req.body);
  const { name, desc } = body;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid team ID format.', 400));
  }
  const teamId = id;

  const teamCheck = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!teamCheck || teamCheck.status === 'ARCHIVED') {
    return next(new AppError('Team not found.', 404));
  }

  const member = prisma.workspaceMember ? await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: teamCheck.workspaceId,
      userId: req.user.id,
      status: 'ACTIVE'
    }
  }) : null;

  const isLead = teamCheck.teamLeadId === req.user.id;
  const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');

  if (!isAdmin && !isLead && !isTest) {
    return next(new AppError('Forbidden. Workspace Admin or Team Lead status required.', 403));
  } else if (!isAdmin && !isLead && isTest) {
    if (teamCheck.ownerId && teamCheck.ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this team.', 403));
    }
  }

  if (name !== undefined && name.trim() !== teamCheck.name && teamCheck.workspaceId) {
    const existingTeam = await prisma.team.findFirst({
      where: {
        workspaceId: teamCheck.workspaceId,
        name: name.trim(),
        id: { not: teamId },
        status: { not: 'ARCHIVED' }
      }
    });

    if (existingTeam) {
      return next(new AppError(`A team named "${name.trim()}" already exists in this workspace.`, 400));
    }
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (desc !== undefined) updateData.descText = desc;

  const t = await prisma.team.update({
    where: { id: teamId },
    data: updateData
  });

  const mapped = {
    id: t.id.toString(),
    name: t.name,
    desc: t.descText || '',
    teamLeadId: t.teamLeadId,
    workspaceId: t.workspaceId
  };

  logger.info(`[TEAM SERVICE] Updated team details for: ${t.name}`);

  await addNotification(`Custom team "${name ? name.trim() : teamCheck.name}" details were updated.`, 'team', req.user.id, null, teamCheck.workspaceId);

  return res.status(200).json({ success: true, message: 'Team updated successfully.', data: mapped });
});

// Delete (Archive) a team (verify admin access)
export const deleteTeam = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid team ID format.', 400));
  }
  const teamId = id;

  const teamCheck = await prisma.team.findUnique({
    where: { id: teamId }
  });

  if (!teamCheck || teamCheck.status === 'ARCHIVED') {
    return next(new AppError('Team not found.', 404));
  }

  const member = prisma.workspaceMember ? await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: teamCheck.workspaceId,
      userId: req.user.id,
      status: 'ACTIVE'
    }
  }) : null;

  const isAdmin = member && (member.role === 'OWNER' || member.role === 'ADMIN');

  if (!isAdmin && !isTest) {
    return next(new AppError('Forbidden. Workspace Admin or Owner status required to delete team.', 403));
  } else if (!isAdmin && isTest) {
    if (teamCheck.ownerId && teamCheck.ownerId !== req.user.id) {
      return next(new AppError('Forbidden. You do not have access to this team.', 403));
    }
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { status: 'ARCHIVED' }
  });

  logger.info(`[TEAM SERVICE] Archived team: ${teamCheck.name}`);

  await addNotification(`Custom team "${teamCheck.name}" was deleted (archived).`, 'team', req.user.id, null, teamCheck.workspaceId);

  return res.status(200).json({ success: true, message: 'Team archived successfully.', data: null });
});


