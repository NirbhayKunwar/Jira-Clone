import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';

export const requireWorkspaceRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.query.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return next(new AppError('Workspace ID is required for role validation.', 400));
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: req.user.id,
          status: 'ACTIVE'
        }
      });

      if (!member) {
        return res.status(403).json({ success: false, message: 'Forbidden. You are not a member of this workspace.' });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden. Insufficient workspace permissions.' });
      }

      req.workspaceMember = member;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireTeamRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const teamId = req.params.teamId || req.query.teamId || req.body.teamId;
      if (!teamId) {
        return next(new AppError('Team ID is required for role validation.', 400));
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }

      // Check if user is active member of workspace linked to team's workspace,
      // or find the team member record directly
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId,
          workspaceMember: {
            userId: req.user.id,
            status: 'ACTIVE'
          },
          status: 'ACTIVE'
        },
        include: {
          workspaceMember: true
        }
      });

      if (!teamMember) {
        return res.status(403).json({ success: false, message: 'Forbidden. You are not a member of this team.' });
      }

      if (!allowedRoles.includes(teamMember.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden. Insufficient team permissions.' });
      }

      req.teamMember = teamMember;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.query.workspaceId || req.body.workspaceId;
      const teamId = req.params.teamId || req.query.teamId || req.body.teamId;

      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      }

      let isAuthorized = false;

      // 1. Check Workspace Permission
      if (workspaceId) {
        const workspaceMember = await prisma.workspaceMember.findFirst({
          where: {
            workspaceId,
            userId: req.user.id,
            status: 'ACTIVE'
          }
        });

        if (workspaceMember) {
          // Check if this workspace role has the requested permission
          const workspacePermission = await prisma.workspaceRolePermission.findFirst({
            where: {
              role: workspaceMember.role,
              permission: { name: permissionName }
            }
          });

          if (workspacePermission) {
            isAuthorized = true;
            req.workspaceMember = workspaceMember;
          }
        }
      }

      // 2. Check Team Permission (fallback/addition)
      if (!isAuthorized && teamId) {
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            teamId,
            workspaceMember: {
              userId: req.user.id,
              status: 'ACTIVE'
            },
            status: 'ACTIVE'
          }
        });

        if (teamMember) {
          const teamPermission = await prisma.teamRolePermission.findFirst({
            where: {
              role: teamMember.role,
              permission: { name: permissionName }
            }
          });

          if (teamPermission) {
            isAuthorized = true;
            req.teamMember = teamMember;
          }
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: `Forbidden. Missing required permission: ${permissionName}`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Privilege escalation checks helper
export const checkPrivilegeEscalation = (actorRole, targetRole) => {
  const roleHierarchies = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    GUEST: 1
  };
  return roleHierarchies[actorRole] <= roleHierarchies[targetRole];
};
