import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';

// Helper to validate MongoDB ObjectId
export const isValidObjectId = (id) => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
};

// Dynamic WorkspaceMember bootstrap/self-heal helper
export const getOrCreateWorkspaceMember = async (workspaceId, userId) => {
  if (!isValidObjectId(workspaceId) || !isValidObjectId(userId)) {
    return null;
  }

  try {
    // 1. Try to find the active WorkspaceMember
    let member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        status: 'ACTIVE'
      }
    });

    if (member) return member;

    // 2. If missing, retrieve workspace details
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!workspace) return null;

    // 3. Retrieve user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return null;

    // 4. Determine role:
    // If the user is the owner of the workspace, promote to OWNER
    let role = 'MEMBER';
    if (workspace.ownerId === userId) {
      role = 'OWNER';
    } else if (user.rbacRole === 'ADMIN') {
      role = 'ADMIN';
    } else if (user.rbacRole === 'LEADER') {
      role = 'ADMIN'; // Map Team Leaders to Admins in workspace scope
    }

    // 5. Verify eligibility:
    // If user is owner, or user's teamOwnerId matches workspace owner, or user has tasks/sprints in this workspace
    const isWorkspaceOwner = workspace.ownerId === userId;
    const isTeamMemberOfOwner = user.teamOwnerId && user.teamOwnerId === workspace.ownerId;
    
    // Check if user has tasks in this workspace
    const taskCount = await prisma.task.count({
      where: { workspaceId, assigneeId: userId }
    });
    const hasTasks = taskCount > 0;

    if (isWorkspaceOwner || isTeamMemberOfOwner || hasTasks || user.rbacRole === 'ADMIN') {
      // Create missing membership record (dynamic self-healing)
      member = await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role,
          status: 'ACTIVE'
        }
      });
      console.log(`[RBAC SELF-HEAL] Bootstrapped missing WorkspaceMember for user ${user.email} in workspace "${workspace.name}" as ${role}`);
      return member;
    }

    return null;
  } catch (err) {
    console.error('[RBAC SELF-HEAL ERROR] Failed to bootstrap workspace member:', err);
    return null;
  }
};

export const requireWorkspaceRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.params.workspaceId || req.query.workspaceId || req.body.workspaceId;
      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          reason: 'Workspace ID is required for role validation.'
        });
      }

      if (!isValidObjectId(workspaceId)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          reason: 'Invalid Workspace ID format (must be 24-character hex string).'
        });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          reason: 'Authentication token missing or invalid.'
        });
      }

      // Self-heal/get WorkspaceMember
      const member = await getOrCreateWorkspaceMember(workspaceId, req.user.id);

      if (!member) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          reason: 'User is not an active WorkspaceMember of this workspace.',
          workspaceId
        });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          reason: `Workspace role [${allowedRoles.join(', ')}] required. Current role: ${member.role}`,
          workspaceId
        });
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
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          reason: 'Team ID is required for role validation.'
        });
      }

      if (!isValidObjectId(teamId)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          reason: 'Invalid Team ID format (must be 24-character hex string).'
        });
      }

      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          reason: 'Authentication token missing or invalid.'
        });
      }

      // Find the team member record
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
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          reason: 'User is not an active member of this team.',
          teamId
        });
      }

      if (!allowedRoles.includes(teamMember.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          reason: `Team role [${allowedRoles.join(', ')}] required. Current role: ${teamMember.role}`,
          teamId
        });
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
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          reason: 'Authentication token missing or invalid.'
        });
      }

      let isAuthorized = false;

      // 1. Check Workspace Permission
      if (workspaceId && isValidObjectId(workspaceId)) {
        const workspaceMember = await getOrCreateWorkspaceMember(workspaceId, req.user.id);

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
      if (!isAuthorized && teamId && isValidObjectId(teamId)) {
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
          error: 'Forbidden',
          reason: `Missing required permission: ${permissionName}`,
          missingPermission: permissionName
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
