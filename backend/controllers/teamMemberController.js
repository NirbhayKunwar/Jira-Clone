import prisma from '../config/prisma.js';
import { z } from 'zod';
import eventBus from '../config/eventBus.js';
import { AppError } from '../middleware/errorHandler.js';
import { isValidObjectId } from '../middleware/rbac.js';

const addTeamMemberSchema = z.object({
  workspaceMemberId: z.string(),
  role: z.enum([
    'TEAM_LEAD', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_ENGINEER',
    'QA_ENGINEER', 'UI_UX_DESIGNER', 'DEVOPS_ENGINEER', 'PRODUCT_MANAGER',
    'BUSINESS_ANALYST', 'VIEWER'
  ]).default('FULLSTACK_ENGINEER')
});

const updateTeamMemberSchema = z.object({
  role: z.enum([
    'TEAM_LEAD', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_ENGINEER',
    'QA_ENGINEER', 'UI_UX_DESIGNER', 'DEVOPS_ENGINEER', 'PRODUCT_MANAGER',
    'BUSINESS_ANALYST', 'VIEWER'
  ])
});

// Helper to extract client details for audit logs
const getClientDetails = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    userAgent: req.headers['user-agent'] || 'Unknown',
    browser: req.headers['user-agent'] ? (req.headers['user-agent'].includes('Chrome') ? 'Chrome' : 'Firefox') : 'Unknown',
    device: 'Desktop'
  };
};

// 1. Get Team Details
export const getTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
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
      }
    });

    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Team not found or archived.' });
    }

    // Verify authorized access
    const wsMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    const isWsAdmin = wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN');
    const isTeamMember = team.teamMembers.some(m => m.workspaceMember?.userId === req.user.id);

    if (!isWsAdmin && !isTeamMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        reason: 'Only Team Members, Workspace Admins, or Workspace Owners can view team details.',
        teamId
      });
    }

    res.status(200).json({ success: true, data: team });
  } catch (error) {
    next(error);
  }
};

// 2. Get Team Members
export const getTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Team not found or archived.' });
    }

    const requester = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!requester) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not have access to this team.' });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId, status: 'ACTIVE' },
      include: {
        workspaceMember: {
          include: { user: { select: { id: true, name: true, email: true } } }
        }
      }
    });

    res.status(200).json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

// 3. Add Workspace Member to Team
export const addTeamMember = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const validationResult = addTeamMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, errors: validationResult.error.flatten() });
    }

    const { workspaceMemberId, role } = validationResult.data;
    if (!isValidObjectId(workspaceMemberId)) {
      return res.status(400).json({ success: false, message: 'Invalid workspace member ID format.' });
    }

    // Check if team exists and is active
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Team not found or archived.' });
    }

    // Verify workspace member exists and belongs to the workspace
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { id: workspaceMemberId }
    });

    if (!wsMember || wsMember.status !== 'ACTIVE' || wsMember.workspaceId !== team.workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Only active Workspace Members belonging to the team workspace can be added.'
      });
    }

    // Check duplicate membership
    const existingTeamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        workspaceMemberId,
        status: 'ACTIVE'
      }
    });

    if (existingTeamMember) {
      return res.status(400).json({
        success: false,
        message: 'Member is already an active member of this team.'
      });
    }

    // Enforce Lead business constraints: Exactly one Team Lead
    if (role === 'TEAM_LEAD') {
      return res.status(400).json({
        success: false,
        message: 'A team can only have exactly one Team Lead. Please use the Lead Transfer endpoint.'
      });
    }

    const newMember = await prisma.teamMember.create({
      data: {
        teamId,
        workspaceMemberId,
        role,
        status: 'ACTIVE'
      }
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('member.joined_team', {
      teamMember: newMember,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(201).json({
      success: true,
      message: 'Workspace member added to team successfully.',
      data: newMember
    });
  } catch (error) {
    next(error);
  }
};

// 4. Update Team Member Role
export const updateTeamMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid team member ID format.' });
    }
    const validationResult = updateTeamMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, errors: validationResult.error.flatten() });
    }

    const { role } = validationResult.data;

    const teamMember = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId, status: 'ACTIVE' }
    });

    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Team member not found or inactive.' });
    }

    // Lead rules: Prevent setting role directly to TEAM_LEAD (must use Lead Transfer)
    if (role === 'TEAM_LEAD' && teamMember.role !== 'TEAM_LEAD') {
      return res.status(400).json({
        success: false,
        message: 'To change Team Lead, use the transfer lead endpoint.'
      });
    }

    // Lead rules: Prevent demoting Team Lead directly
    if (teamMember.role === 'TEAM_LEAD' && role !== 'TEAM_LEAD') {
      return res.status(400).json({
        success: false,
        message: 'A Team Lead cannot be demoted directly. You must assign another Team Lead first.'
      });
    }

    const oldRole = teamMember.role;

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { role }
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('member.team_role_changed', {
      teamMember: updated,
      oldRole,
      newRole: role,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(200).json({
      success: true,
      message: 'Team member role updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// 5. Remove Member from Team
export const removeTeamMember = async (req, res, next) => {
  try {
    const { teamId, memberId } = req.params;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid team member ID format.' });
    }

    const teamMember = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId, status: 'ACTIVE' }
    });

    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    // Lead rules: Prevent removing Team Lead
    if (teamMember.role === 'TEAM_LEAD') {
      return res.status(400).json({
        success: false,
        message: 'A Team Lead cannot be removed until another Team Lead is assigned.'
      });
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { status: 'REMOVED' }
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('member.removed_from_team', {
      teamMember: updated,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(200).json({
      success: true,
      message: 'Member removed from team successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 6. Transfer Team Lead
export const transferTeamLead = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { newLeadMemberId } = req.body;
    if (!isValidObjectId(newLeadMemberId)) {
      return res.status(400).json({ success: false, message: 'Invalid target lead member ID format.' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { teamMembers: { where: { status: 'ACTIVE' } } }
    });

    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({ success: false, message: 'Team not found or archived.' });
    }

    // Find the target member in the team
    const newLeadMember = team.teamMembers.find(m => m.id === newLeadMemberId);
    if (!newLeadMember) {
      return res.status(400).json({
        success: false,
        message: 'The target member does not belong to this team.'
      });
    }

    // Retrieve WorkspaceMember user record
    const targetWsMember = await prisma.workspaceMember.findUnique({
      where: { id: newLeadMember.workspaceMemberId }
    });

    if (!targetWsMember || targetWsMember.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Target member must be active in workspace.'
      });
    }

    // Current lead ID (User ID)
    const oldLeadUserId = team.teamLeadId;

    // Transaction to safely switch roles:
    // 1. Demote old lead to Developer (TeamMember and Team records)
    // 2. Promote new lead to Team Lead (TeamMember and Team records)
    await prisma.$transaction(async (tx) => {
      // Find old lead TeamMember record and update role to Developer
      if (oldLeadUserId) {
        const oldLeadWsMember = await tx.workspaceMember.findFirst({
          where: { userId: oldLeadUserId, workspaceId: targetWsMember.workspaceId }
        });

        if (oldLeadWsMember) {
          await tx.teamMember.updateMany({
            where: { teamId, workspaceMemberId: oldLeadWsMember.id, role: 'TEAM_LEAD' },
            data: { role: 'FULLSTACK_ENGINEER' }
          });
        }
      }

      // Promote new lead TeamMember record to TEAM_LEAD
      await tx.teamMember.update({
        where: { id: newLeadMemberId },
        data: { role: 'TEAM_LEAD' }
      });

      // Update Team lead reference
      await tx.team.update({
        where: { id: teamId },
        data: { teamLeadId: targetWsMember.userId }
      });
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('team.lead_transferred', {
      team,
      oldLeadId: oldLeadUserId,
      newLeadId: targetWsMember.userId,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(200).json({
      success: true,
      message: 'Team Lead transferred successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 7. Archive Team
export const archiveTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { status: 'ARCHIVED' }
    });

    // Log archiving to Audit logs
    const clientDetails = getClientDetails(req);
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'TeamArchived',
        resourceType: 'Team',
        resourceId: teamId,
        ...clientDetails
      }
    });

    res.status(200).json({
      success: true,
      message: 'Team archived successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};
