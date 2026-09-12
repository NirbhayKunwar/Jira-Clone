import prisma from '../config/prisma.js';
import { z } from 'zod';
import crypto from 'crypto';
import eventBus from '../config/eventBus.js';
import { AppError } from '../middleware/errorHandler.js';
import { isValidObjectId } from '../middleware/rbac.js';
import { sendTeamInviteEmail } from './authController.js';

// Schemas for input validation
const inviteSchema = z.object({
  email: z.string().email(),
  workspaceRole: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
  teamId: z.string().optional().nullable(),
  teamRole: z.enum([
    'TEAM_LEAD', 'FRONTEND_DEVELOPER', 'BACKEND_DEVELOPER', 'FULLSTACK_ENGINEER',
    'QA_ENGINEER', 'UI_UX_DESIGNER', 'DEVOPS_ENGINEER', 'PRODUCT_MANAGER',
    'BUSINESS_ANALYST', 'VIEWER'
  ]).optional().nullable(),
  projectId: z.string().optional().nullable(),
  projectRole: z.enum([
    'PROJECT_LEAD', 'DEVELOPER', 'TESTER', 'DESIGNER', 'OBSERVER'
  ]).optional().nullable()
});

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'GUEST']),
  status: z.enum(['ACTIVE', 'DEACTIVATED', 'ARCHIVED'])
});

// Helper to extract client details for audit logs
const getClientDetails = (req) => {
  const userAgent = req.headers['user-agent'] || 'Unknown';
  // Standard regex to parse basic details
  let browser = 'Unknown';
  let device = 'Desktop';
  if (/mobile/i.test(userAgent)) device = 'Mobile';
  if (/tablet/i.test(userAgent)) device = 'Tablet';
  
  if (/chrome/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent)) browser = 'Safari';
  else if (/edge/i.test(userAgent)) browser = 'Edge';

  return {
    ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
    userAgent,
    browser,
    device
  };
};

// 1. Get Workspace Members (with Cursor-based Pagination, Search, Filter)
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null' || !isValidObjectId(workspaceId)) {
      return res.status(200).json({
        success: true,
        data: {
          members: [],
          nextCursor: null,
          total: 0
        }
      });
    }
    const { search = '', role, status = 'ACTIVE', limit = 10, cursor } = req.query;

    const parsedLimit = parseInt(limit, 10);
    const searchFilter = search
      ? {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } }
            ]
          }
        }
      : {};

    const roleFilter = role ? { role } : {};
    const statusFilter = status ? { status } : {};

    const queryOptions = {
      where: {
        workspaceId,
        ...searchFilter,
        ...roleFilter,
        ...statusFilter
      },
      take: parsedLimit + 1, // Fetch limit + 1 to check if there is a next page
      orderBy: { id: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            dept: true,
            location: true
          }
        },
        teamMemberships: {
          where: { status: 'ACTIVE' },
          include: { team: true }
        },
        projectMemberships: {
          include: { project: true }
        }
      }
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1; // Skip the cursor itself
    }

    const members = await prisma.workspaceMember.findMany(queryOptions);

    let nextCursor = null;
    if (members.length > parsedLimit) {
      const nextItem = members.pop(); // Remove the extra item
      nextCursor = nextItem.id;
    }

    res.status(200).json({
      success: true,
      data: {
        members,
        nextCursor
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Invite Workspace Member
export const inviteWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const validationResult = inviteSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, errors: validationResult.error.flatten() });
    }

    const { email, workspaceRole, teamId, teamRole, projectId, projectRole } = validationResult.data;

    // Check if user is already an active member of this workspace
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { email },
        status: 'ACTIVE'
      }
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'This user is already an active member of the workspace.'
      });
    }

    // Check if there is already a pending invitation for this email in this workspace
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        workspaceId,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (pendingInvite) {
      // Refresh token and expiration date on existing pending invitation
      const newToken = crypto.randomBytes(32).toString('hex');
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const updatedInvite = await prisma.invitation.update({
        where: { id: pendingInvite.id },
        data: {
          token: newToken,
          expiresAt: newExpiresAt,
          workspaceRole,
          teamId,
          teamRole,
          projectId,
          projectRole,
          invitedById: req.user.id
        }
      });

      try {
        await sendTeamInviteEmail({
          to: updatedInvite.email,
          name: updatedInvite.email.split('@')[0],
          invitedByName: req.user.name || req.user.email,
          isSignup: true
        });
      } catch (emailErr) {
        console.error('[WORKSPACE INVITE EMAIL ERROR]', emailErr);
      }

      return res.status(200).json({
        success: true,
        message: 'Invitation re-sent successfully.',
        data: {
          id: updatedInvite.id,
          email: updatedInvite.email,
          workspaceRole: updatedInvite.workspaceRole,
          expiresAt: updatedInvite.expiresAt
        }
      });
    }

    // Check if target email belongs to an existing registered User in the database
    const registeredUser = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() }
    });

    if (registeredUser) {
      // Auto-add existing registered user as an active workspace member
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: registeredUser.id,
          role: workspaceRole,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              dept: true,
              location: true
            }
          }
        }
      });

      // If teamId is provided, also add to team
      if (teamId) {
        await prisma.teamMember.create({
          data: {
            teamId,
            workspaceMemberId: member.id,
            role: teamRole || 'FULLSTACK_ENGINEER'
          }
        }).catch(() => {});
      }

      // If projectId is provided, also add to project
      if (projectId) {
        await prisma.projectMember.create({
          data: {
            projectId,
            workspaceMemberId: member.id,
            role: projectRole || 'DEVELOPER'
          }
        }).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: `${registeredUser.name || email} added to workspace successfully.`,
        data: member
      });
    }

    // Create the invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

    const invitation = await prisma.invitation.create({
      data: {
        email: email.trim(),
        workspaceId,
        workspaceRole,
        teamId,
        teamRole,
        projectId,
        projectRole,
        token,
        expiresAt,
        invitedById: req.user.id
      }
    });

    // Directly send the workspace invite email via Nodemailer / Gmail SMTP
    try {
      await sendTeamInviteEmail({
        to: invitation.email,
        name: invitation.email.split('@')[0],
        invitedByName: req.user.name || req.user.email,
        isSignup: true
      });
    } catch (emailErr) {
      console.error('[WORKSPACE INVITE EMAIL ERROR]', emailErr);
    }

    // Emit event for Audit Log & Notifications
    const clientDetails = getClientDetails(req);
    eventBus.emit('invitation.sent', {
      invitation,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully.',
      data: {
        id: invitation.id,
        email: invitation.email,
        workspaceRole: invitation.workspaceRole,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Accept Invitation
export const acceptInvitation = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Invitation token is required.' });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true }
    });

    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is invalid, expired, or already revoked.'
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login or register.' });
    }

    // Verify accepting user email matches invitation email (or allow if registration override)
    if (req.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. This invitation was sent to a different email address.'
      });
    }

    // Transaction to safely perform changes:
    // 1. Re-verify invitation status atomically
    // 2. Create/Reactivate WorkspaceMember
    // 3. Create TeamMember (if teamId specified)
    // 4. Create ProjectMember (if projectId specified)
    // 5. Update Invitation status
    const result = await prisma.$transaction(async (tx) => {
      const freshInvite = await tx.invitation.findUnique({
        where: { id: invitation.id }
      });

      if (!freshInvite || freshInvite.status !== 'PENDING' || freshInvite.expiresAt < new Date()) {
        throw new Error('Invitation token is no longer valid or has already been accepted.');
      }

      // Check if user is already a workspace member
      let wsMember = await tx.workspaceMember.findFirst({
        where: {
          workspaceId: invitation.workspaceId,
          userId: req.user.id
        }
      });

      if (wsMember) {
        if (wsMember.status === 'ACTIVE') {
          throw new Error('User is already a member of this workspace.');
        } else {
          // Reactivate membership
          wsMember = await tx.workspaceMember.update({
            where: { id: wsMember.id },
            data: {
              status: 'ACTIVE',
              role: invitation.workspaceRole
            }
          });
        }
      } else {
        // Create new membership
        wsMember = await tx.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: req.user.id,
            role: invitation.workspaceRole,
            status: 'ACTIVE'
          }
        });
      }

      // Add to Team if specified
      let teamMember = null;
      if (invitation.teamId) {
        const existingTM = await tx.teamMember.findFirst({
          where: { teamId: invitation.teamId, workspaceMemberId: wsMember.id }
        });
        if (!existingTM) {
          teamMember = await tx.teamMember.create({
            data: {
              teamId: invitation.teamId,
              workspaceMemberId: wsMember.id,
              role: invitation.teamRole || 'FULLSTACK_ENGINEER',
              status: 'ACTIVE'
            }
          });
        } else {
          teamMember = await tx.teamMember.update({
            where: { id: existingTM.id },
            data: { status: 'ACTIVE', role: invitation.teamRole || existingTM.role }
          });
        }
      }

      // Add to Project
      let targetProjectId = invitation.projectId;
      if (!targetProjectId) {
        const firstProj = await tx.project.findFirst({
          where: { workspaceId: invitation.workspaceId }
        });
        if (firstProj) targetProjectId = firstProj.id;
      }

      let projectMember = null;
      if (targetProjectId) {
        const existingPM = await tx.projectMember.findFirst({
          where: { projectId: targetProjectId, workspaceMemberId: wsMember.id }
        });
        if (!existingPM) {
          projectMember = await tx.projectMember.create({
            data: {
              projectId: targetProjectId,
              workspaceMemberId: wsMember.id,
              role: invitation.projectRole || 'DEVELOPER'
            }
          });
        }
      }

      // Update Invitation Status
      const updatedInvite = await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });

      return { wsMember, teamMember, projectMember, updatedInvite };
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('invitation.accepted', {
      invitation: result.updatedInvite,
      member: result.wsMember,
      actorId: req.user.id,
      ...clientDetails
    });

    if (result.teamMember) {
      eventBus.emit('member.joined_team', {
        teamMember: result.teamMember,
        actorId: req.user.id,
        ...clientDetails
      });
    }

    if (result.projectMember) {
      eventBus.emit('project.assigned', {
        projectMember: result.projectMember,
        actorId: req.user.id,
        ...clientDetails
      });
    }

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully.',
      data: result.wsMember
    });
  } catch (error) {
    if (error.message && error.message.includes('already a member')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// 4. Update Workspace Member Role/Status
export const updateWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid member ID format.' });
    }
    const validationResult = updateMemberSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ success: false, errors: validationResult.error.flatten() });
    }

    const { role, status } = validationResult.data;

    // Fetch the target member
    const targetMember = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });

    if (!targetMember) {
      return res.status(404).json({ success: false, message: 'Workspace member not found.' });
    }

    // Privilege checks:
    // Only current OWNER can modify OWNER role, or Admins cannot demote OWNERs
    const actorMembership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: req.user.id }
    });

    if (!actorMembership) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (targetMember.role === 'OWNER' && actorMembership.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Privilege Escalation Guard: Only the Workspace Owner can modify the Owner role.'
      });
    }

    if (role === 'OWNER' && actorMembership.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Privilege Escalation Guard: Only the Owner can transfer ownership.'
      });
    }

    const oldRole = targetMember.role;
    const oldStatus = targetMember.status;

    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role, status }
    });

    const clientDetails = getClientDetails(req);

    if (oldRole !== role) {
      eventBus.emit('member.workspace_role_changed', {
        member: updated,
        oldRole,
        newRole: role,
        actorId: req.user.id,
        ...clientDetails
      });
    }

    res.status(200).json({
      success: true,
      message: 'Workspace member updated successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// 5. Remove/Archive Workspace Member with Task Verification
export const removeWorkspaceMember = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid member ID format.' });
    }

    const targetMember = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: true }
    });

    if (!targetMember) {
      return res.status(404).json({ success: false, message: 'Workspace member not found.' });
    }

    // Escalate safety check: Cannot delete Owner
    if (targetMember.role === 'OWNER') {
      return res.status(400).json({
        success: false,
        message: 'Workspace Owner cannot be removed. You must transfer ownership first.'
      });
    }

    // Check for Active tasks/sprints owned by user inside this workspace
    const assignedTasks = await prisma.task.count({
      where: {
        workspaceId,
        assigneeId: targetMember.userId,
        status: { notIn: ['done', 'completed'] }
      }
    });

    // In a real-world scenario, we'd check created boards, sprints, projects.
    // If assignedTasks > 0, return info details for prompt transfer.
    if (assignedTasks > 0) {
      return res.status(422).json({
        success: false,
        requiresTransfer: true,
        message: `Member owns ${assignedTasks} active tasks. Please transfer tasks before removal.`,
        data: { activeTasksCount: assignedTasks }
      });
    }

    // Soft delete / Archive membership inside transaction
    const result = await prisma.$transaction(async (tx) => {
      const archivedMember = await tx.workspaceMember.update({
        where: { id: memberId },
        data: { status: 'ARCHIVED' }
      });

      // Soft delete their team memberships
      await tx.teamMember.updateMany({
        where: { workspaceMemberId: memberId },
        data: { status: 'REMOVED' }
      });

      return archivedMember;
    });

    const clientDetails = getClientDetails(req);
    eventBus.emit('member.removed_from_workspace', {
      workspaceMember: result,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(200).json({
      success: true,
      message: 'Workspace member archived and removed from all teams successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// 6. List Workspace Invitations
export const getWorkspaceInvitations = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const invitations = await prisma.invitation.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: invitations });
  } catch (error) {
    next(error);
  }
};

// 7. Revoke Workspace Invitation
export const revokeInvitation = async (req, res, next) => {
  try {
    const { workspaceId, inviteId } = req.params;
    if (!isValidObjectId(inviteId)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID format.' });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: inviteId, workspaceId }
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    const updated = await prisma.invitation.update({
      where: { id: inviteId },
      data: { status: 'REVOKED' }
    });

    // Log Revocation Action
    const clientDetails = getClientDetails(req);
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'InvitationRevoked',
        resourceType: 'Workspace',
        resourceId: workspaceId,
        oldValue: `Pending: ${invitation.email}`,
        newValue: `Revoked: ${invitation.email}`,
        ...clientDetails
      }
    });

    res.status(200).json({
      success: true,
      message: 'Invitation revoked successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// 8. Resend Workspace Invitation
export const resendInvitation = async (req, res, next) => {
  try {
    const { workspaceId, inviteId } = req.params;
    if (!isValidObjectId(inviteId)) {
      return res.status(400).json({ success: false, message: 'Invalid invitation ID format.' });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: inviteId, workspaceId }
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    // Refresh expiration timer
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const updated = await prisma.invitation.update({
      where: { id: inviteId },
      data: {
        expiresAt,
        status: 'PENDING'
      }
    });

    // Publish event to resend
    const clientDetails = getClientDetails(req);
    eventBus.emit('invitation.sent', {
      invitation: updated,
      actorId: req.user.id,
      ...clientDetails
    });

    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully.',
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// 9. Get Workspace Audit Logs
export const getWorkspaceAuditLogs = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    // Find all audit logs associated strictly with the active workspace
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceId: workspaceId
      },
      include: {
        actor: { select: { name: true, email: true, role: true } },
        targetUser: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    const mapped = auditLogs.map(log => ({
      id: log.id.toString(),
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      timestamp: log.timestamp,
      actor: log.actor ? { name: log.actor.name, email: log.actor.email, role: log.actor.role } : null,
      targetUser: log.targetUser ? { name: log.targetUser.name, email: log.targetUser.email } : null
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

// 10. Get Workspace Activity Timeline
export const getWorkspaceActivity = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    
    const logs = await prisma.auditLog.findMany({
      where: {
        resourceId: workspaceId
      },
      include: {
        actor: { select: { name: true, email: true, role: true } },
        targetUser: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 30
    });

    const mapped = logs.map(log => ({
      id: log.id.toString(),
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      oldValue: log.oldValue,
      newValue: log.newValue,
      timestamp: log.timestamp,
      actor: log.actor ? { name: log.actor.name, email: log.actor.email } : null,
      targetUser: log.targetUser ? { name: log.targetUser.name, email: log.targetUser.email } : null
    }));

    res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    next(error);
  }
};

// 11. Get Workspace Role Permissions Matrix
export const getWorkspacePermissions = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const workspacePermissions = await prisma.workspaceRolePermission.findMany({
      include: { permission: true }
    });

    const teamPermissions = await prisma.teamRolePermission.findMany({
      include: { permission: true }
    });

    res.status(200).json({
      success: true,
      data: {
        workspace: workspacePermissions,
        team: teamPermissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// 12. Transfer Active Tasks Ownership helper
export const transferMemberTasks = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { targetUserId } = req.body;
    if (!isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: 'Invalid source member ID format.' });
    }
    if (!isValidObjectId(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid destination user ID format.' });
    }

    const sourceMember = await prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId }
    });

    if (!sourceMember) {
      return res.status(404).json({ success: false, message: 'Source member not found.' });
    }

    const destMember = await prisma.workspaceMember.findFirst({
      where: { userId: targetUserId, workspaceId, status: 'ACTIVE' }
    });

    if (!destMember) {
      return res.status(400).json({ success: false, message: 'Target transfer user is not active in this workspace.' });
    }

    // Perform bulk task transfer
    const transferResult = await prisma.task.updateMany({
      where: {
        workspaceId,
        assigneeId: sourceMember.userId,
        status: { notIn: ['done', 'completed'] }
      },
      data: {
        assigneeId: targetUserId
      }
    });

    // Log action to Audit log
    const clientDetails = getClientDetails(req);
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        targetUserId: sourceMember.userId,
        action: 'TasksTransferred',
        resourceType: 'Workspace',
        resourceId: workspaceId,
        newValue: `Transferred tasks to ${targetUserId}. Count: ${transferResult.count}`,
        ...clientDetails
      }
    });

    res.status(200).json({
      success: true,
      message: `Successfully transferred ${transferResult.count} active tasks.`,
      data: { count: transferResult.count }
    });
  } catch (error) {
    next(error);
  }
};

// 13. Get Workspace Projects
export const getWorkspaceProjects = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    if (!workspaceId || workspaceId === 'undefined' || workspaceId === 'null' || !isValidObjectId(workspaceId)) {
      return res.status(200).json({ success: true, data: [] });
    }
    const projects = await prisma.project.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      include: {
        projectMembers: {
          include: {
            workspaceMember: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true, dept: true }
                }
              }
            }
          }
        }
      }
    });
    res.status(200).json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

// 14. Add Member to Project
export const addProjectMember = async (req, res, next) => {
  try {
    const { workspaceId, projectId } = req.params;
    const { workspaceMemberId, role } = req.body;

    if (!workspaceMemberId) {
      return res.status(400).json({ success: false, message: 'Workspace member ID is required.' });
    }

    // Resolve workspace member by WorkspaceMember.id or User.id
    let wm = await prisma.workspaceMember.findFirst({
      where: { id: workspaceMemberId, workspaceId, status: 'ACTIVE' }
    });

    if (!wm) {
      wm = await prisma.workspaceMember.findFirst({
        where: { userId: workspaceMemberId, workspaceId, status: 'ACTIVE' }
      });
    }

    if (!wm) {
      return res.status(404).json({ success: false, message: 'Active workspace member not found in this workspace.' });
    }

    // Resolve target project by Project.id or Workspace.id
    let targetProject = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!targetProject) {
      targetProject = await prisma.project.findFirst({
        where: { workspaceId: projectId }
      });
    }

    if (!targetProject) {
      targetProject = await prisma.project.findFirst({
        where: { workspaceId }
      });
    }

    if (!targetProject) {
      const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (ws) {
        targetProject = await prisma.project.create({
          data: {
            name: ws.name,
            key: ws.key,
            workspaceId: ws.id
          }
        });
      }
    }

    if (!targetProject) {
      return res.status(404).json({ success: false, message: 'Project not found for this workspace.' });
    }

    const existing = await prisma.projectMember.findFirst({
      where: { projectId: targetProject.id, workspaceMemberId: wm.id }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Member is already assigned to this project.' });
    }

    const pm = await prisma.projectMember.create({
      data: {
        projectId: targetProject.id,
        workspaceMemberId: wm.id,
        role: role || 'DEVELOPER'
      },
      include: {
        workspaceMember: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, dept: true } }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Member added to project successfully.',
      data: pm
    });
  } catch (error) {
    next(error);
  }
};

// 15. Remove Member from Specific Project
export const removeProjectMember = async (req, res, next) => {
  try {
    const { workspaceId, projectId, projectMemberId } = req.params;

    let pm = await prisma.projectMember.findFirst({
      where: { id: projectMemberId },
      include: { workspaceMember: true }
    });

    if (!pm) {
      let targetProj = await prisma.project.findUnique({ where: { id: projectId } });
      if (!targetProj) {
        targetProj = await prisma.project.findFirst({ where: { workspaceId: projectId } });
      }
      if (!targetProj) {
        targetProj = await prisma.project.findFirst({ where: { workspaceId } });
      }

      if (targetProj) {
        pm = await prisma.projectMember.findFirst({
          where: {
            projectId: targetProj.id,
            OR: [
              { workspaceMemberId: projectMemberId },
              { workspaceMember: { userId: projectMemberId } }
            ]
          },
          include: { workspaceMember: true }
        });
      }
    }

    if (!pm) {
      return res.status(404).json({ success: false, message: 'Project member record not found.' });
    }

    await prisma.projectMember.delete({
      where: { id: pm.id }
    });

    res.status(200).json({
      success: true,
      message: 'Member removed from project successfully.'
    });
  } catch (error) {
    next(error);
  }
};
