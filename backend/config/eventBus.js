import { EventEmitter } from 'events';
import prisma from './prisma.js';
import logger from './logger.js';

class CentralEventBus extends EventEmitter {
  constructor() {
    super();
    this.registerDefaultListeners();
  }

  registerDefaultListeners() {
    // 1. Invitation Sent
    this.on('invitation.sent', async (data) => {
      try {
        const { invitation, actorId, ipAddress, browser, device, userAgent } = data;
        await prisma.auditLog.create({
          data: {
            actorId,
            action: 'InvitationSent',
            resourceType: 'Workspace',
            resourceId: invitation.workspaceId,
            newValue: `Invited ${invitation.email} as ${invitation.workspaceRole}`,
            ipAddress,
            browser,
            device,
            userAgent
          }
        });
        logger.info(`[EVENT BUS] AuditLog created for invitation.sent to: ${invitation.email}`);
      } catch (err) {
        logger.error('[EVENT BUS ERROR] invitation.sent listener error:', err);
      }
    });

    // 2. Invitation Accepted
    this.on('invitation.accepted', async (data) => {
      try {
        const { invitation, member, actorId, ipAddress, browser, device, userAgent } = data;
        
        // Audit log
        await prisma.auditLog.create({
          data: {
            actorId,
            targetUserId: invitation.invitedById,
            action: 'InvitationAccepted',
            resourceType: 'Workspace',
            resourceId: invitation.workspaceId,
            newValue: `Member ${invitation.email} accepted invitation`,
            ipAddress,
            browser,
            device,
            userAgent
          }
        });

        // Notification to inviter
        await prisma.notification.create({
          data: {
            title: 'Invitation Accepted',
            message: `${invitation.email} has accepted your invitation to join the workspace.`,
            type: 'INVITATION',
            userId: invitation.invitedById
          }
        });
        logger.info(`[EVENT BUS] AuditLog and Notification created for invitation.accepted`);
      } catch (err) {
        logger.error('[EVENT BUS ERROR] invitation.accepted listener error:', err);
      }
    });

    // 3. Member Joined Team
    this.on('member.joined_team', async (data) => {
      try {
        const { teamMember, actorId, ipAddress, browser, device, userAgent } = data;
        
        // Retrieve team and user info for richer logging
        const team = await prisma.team.findUnique({ where: { id: teamMember.teamId } });
        const wsMember = await prisma.workspaceMember.findUnique({
          where: { id: teamMember.workspaceMemberId },
          include: { user: true }
        });

        if (wsMember && team) {
          // Audit Log
          await prisma.auditLog.create({
            data: {
              actorId,
              targetUserId: wsMember.userId,
              action: 'JoinedTeam',
              resourceType: 'Team',
              resourceId: team.id,
              newValue: `Added to team: ${team.name} as ${teamMember.role}`,
              ipAddress,
              browser,
              device,
              userAgent
            }
          });

          // Notification to user
          await prisma.notification.create({
            data: {
              title: 'Added to Team',
              message: `You have been added to the team "${team.name}" as a ${teamMember.role}.`,
              type: 'TEAM',
              userId: wsMember.userId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] member.joined_team listener error:', err);
      }
    });

    // 4. Role Changed (Workspace Role)
    this.on('member.workspace_role_changed', async (data) => {
      try {
        const { member, oldRole, newRole, actorId, ipAddress, browser, device, userAgent } = data;
        const targetUser = await prisma.workspaceMember.findUnique({
          where: { id: member.id },
          include: { user: true }
        });

        if (targetUser) {
          await prisma.auditLog.create({
            data: {
              actorId,
              targetUserId: targetUser.userId,
              action: 'WorkspaceRoleChanged',
              resourceType: 'Workspace',
              resourceId: member.workspaceId,
              oldValue: oldRole,
              newValue: newRole,
              ipAddress,
              browser,
              device,
              userAgent
            }
          });

          await prisma.notification.create({
            data: {
              title: 'Workspace Role Updated',
              message: `Your workspace access role has been updated from ${oldRole} to ${newRole}.`,
              type: 'ROLE_CHANGE',
              userId: targetUser.userId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] member.workspace_role_changed listener error:', err);
      }
    });

    // 5. Role Changed (Team Role)
    this.on('member.team_role_changed', async (data) => {
      try {
        const { teamMember, oldRole, newRole, actorId, ipAddress, browser, device, userAgent } = data;
        const wsMember = await prisma.workspaceMember.findUnique({
          where: { id: teamMember.workspaceMemberId },
          include: { user: true }
        });

        if (wsMember) {
          await prisma.auditLog.create({
            data: {
              actorId,
              targetUserId: wsMember.userId,
              action: 'TeamRoleChanged',
              resourceType: 'Team',
              resourceId: teamMember.teamId,
              oldValue: oldRole,
              newValue: newRole,
              ipAddress,
              browser,
              device,
              userAgent
            }
          });

          const team = await prisma.team.findUnique({ where: { id: teamMember.teamId } });
          await prisma.notification.create({
            data: {
              title: 'Team Role Updated',
              message: `Your role in the team "${team ? team.name : 'Unknown'}" was changed to ${newRole}.`,
              type: 'ROLE_CHANGE',
              userId: wsMember.userId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] member.team_role_changed listener error:', err);
      }
    });

    // 6. Team Lead Transferred
    this.on('team.lead_transferred', async (data) => {
      try {
        const { team, oldLeadId, newLeadId, actorId, ipAddress, browser, device, userAgent } = data;
        
        await prisma.auditLog.create({
          data: {
            actorId,
            action: 'TeamLeadTransferred',
            resourceType: 'Team',
            resourceId: team.id,
            oldValue: oldLeadId || 'None',
            newValue: newLeadId,
            ipAddress,
            browser,
            device,
            userAgent
          }
        });

        if (newLeadId) {
          await prisma.notification.create({
            data: {
              title: 'Assigned as Team Lead',
              message: `You are now the Team Lead of the team "${team.name}".`,
              type: 'TEAM',
              userId: newLeadId
            }
          });
        }

        if (oldLeadId) {
          await prisma.notification.create({
            data: {
              title: 'Team Lead Status Updated',
              message: `Your Team Lead role for "${team.name}" has been transferred.`,
              type: 'TEAM',
              userId: oldLeadId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] team.lead_transferred listener error:', err);
      }
    });

    // 7. Project Assigned
    this.on('project.assigned', async (data) => {
      try {
        const { projectMember, actorId, ipAddress, browser, device, userAgent } = data;
        const project = await prisma.project.findUnique({ where: { id: projectMember.projectId } });
        const wsMember = await prisma.workspaceMember.findUnique({
          where: { id: projectMember.workspaceMemberId },
          include: { user: true }
        });

        if (wsMember && project) {
          await prisma.auditLog.create({
            data: {
              actorId,
              targetUserId: wsMember.userId,
              action: 'ProjectAssigned',
              resourceType: 'Project',
              resourceId: project.id,
              newValue: `Assigned to project ${project.name} as ${projectMember.role}`,
              ipAddress,
              browser,
              device,
              userAgent
            }
          });

          await prisma.notification.create({
            data: {
              title: 'Assigned to Project',
              message: `You have been assigned to the project "${project.name}" as ${projectMember.role}.`,
              type: 'PROJECT',
              userId: wsMember.userId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] project.assigned listener error:', err);
      }
    });

    // 8. Member Removed from Team
    this.on('member.removed_from_team', async (data) => {
      try {
        const { teamMember, actorId, ipAddress, browser, device, userAgent } = data;
        const team = await prisma.team.findUnique({ where: { id: teamMember.teamId } });
        const wsMember = await prisma.workspaceMember.findUnique({
          where: { id: teamMember.workspaceMemberId },
          include: { user: true }
        });

        if (wsMember && team) {
          await prisma.auditLog.create({
            data: {
              actorId,
              targetUserId: wsMember.userId,
              action: 'RemovedFromTeam',
              resourceType: 'Team',
              resourceId: team.id,
              ipAddress,
              browser,
              device,
              userAgent
            }
          });

          await prisma.notification.create({
            data: {
              title: 'Removed from Team',
              message: `You have been removed from the team "${team.name}".`,
              type: 'TEAM',
              userId: wsMember.userId
            }
          });
        }
      } catch (err) {
        logger.error('[EVENT BUS ERROR] member.removed_from_team listener error:', err);
      }
    });

    // 9. Member Removed from Workspace
    this.on('member.removed_from_workspace', async (data) => {
      try {
        const { workspaceMember, actorId, ipAddress, browser, device, userAgent } = data;
        
        await prisma.auditLog.create({
          data: {
            actorId,
            targetUserId: workspaceMember.userId,
            action: 'RemovedFromWorkspace',
            resourceType: 'Workspace',
            resourceId: workspaceMember.workspaceId,
            ipAddress,
            browser,
            device,
            userAgent
          }
        });

        await prisma.notification.create({
          data: {
            title: 'Removed from Workspace',
            message: `Your membership in workspace has been archived/revoked.`,
            type: 'SYSTEM',
            userId: workspaceMember.userId
          }
        });
      } catch (err) {
        logger.error('[EVENT BUS ERROR] member.removed_from_workspace listener error:', err);
      }
    });
  }
}

const eventBus = new CentralEventBus();
export default eventBus;
