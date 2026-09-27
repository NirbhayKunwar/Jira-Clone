import prisma from '../config/prisma.js';

/**
 * Validate an ID.
 *
 * Your current project uses Mongo-style ObjectId validation in several
 * places even though the newer team architecture uses Prisma relations.
 *
 * Keep this compatible with your existing IDs.
 */
export const isValidObjectId = (value) => {
  if (typeof value !== 'string') return false;

  return /^[0-9a-fA-F]{24}$/.test(value);
};

/**
 * Require the authenticated user to be an ACTIVE member
 * of the workspace that owns the requested team.
 *
 * Expected route:
 *   /api/teams/:teamId/...
 *
 * This middleware stores the workspace membership on:
 *
 *   req.workspaceMember
 *
 * and the team on:
 *
 *   req.team
 */
export const requireTeamWorkspaceMember = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required.'
      });
    }

    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'teamId is required.'
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });

    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Team not found or archived.'
      });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not an active member of this workspace.'
      });
    }

    req.team = team;
    req.workspaceMember = workspaceMember;

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Require permission to manage members of a team.
 *
 * Rules:
 *
 * Workspace OWNER
 *   -> can manage every team
 *
 * Workspace ADMIN
 *   -> can manage every team
 *
 * Workspace MEMBER
 *   -> can manage only if they are TEAM_LEAD of that team
 *
 * Everyone else
 *   -> denied
 *
 * IMPORTANT:
 * The workspace role is checked from WorkspaceMember.
 * The team role is checked from TeamMember.
 *
 * We do NOT use:
 *   req.user.rbacRole
 *   req.user.teamOwnerId
 *
 * as the primary authorization source.
 */
export const requireWorkspaceAdminOrTeamLead = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required.'
      });
    }

    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'teamId is required.'
      });
    }

    /**
     * Get the team.
     */
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });

    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Team not found or archived.'
      });
    }

    /**
     * Get workspace membership.
     */
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not an active member of this workspace.'
      });
    }

    /**
     * OWNER and ADMIN can manage all teams in workspace.
     */
    if (
      workspaceMember.role === 'OWNER' ||
      workspaceMember.role === 'ADMIN'
    ) {
      req.team = team;
      req.workspaceMember = workspaceMember;

      return next();
    }

    /**
     * For normal workspace members, check whether
     * they are the Team Lead of this specific team.
     */
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        workspaceMemberId: workspaceMember.id,
        status: 'ACTIVE'
      }
    });

    if (!teamMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to manage this team.'
      });
    }

    if (teamMember.role !== 'TEAM_LEAD') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only a Team Lead, Workspace Admin, or Workspace Owner can manage team members.'
      });
    }

    req.team = team;
    req.workspaceMember = workspaceMember;
    req.teamMember = teamMember;

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Require an active workspace member.
 *
 * Useful for GET operations where normal members
 * are allowed to view team information.
 */
export const requireWorkspaceMember = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required.'
      });
    }

    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'teamId is required.'
      });
    }

    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });

    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Team not found or archived.'
      });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: team.workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not a member of this workspace.'
      });
    }

    req.team = team;
    req.workspaceMember = workspaceMember;

    next();
  } catch (error) {
    next(error);
  }
};


/**
 * Optional helper for workspace-level management.
 *
 * This can be used on routes such as:
 *
 *   /api/workspaces/:workspaceId/...
 *
 * OWNER and ADMIN are allowed.
 */
export const requireWorkspaceAdmin = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required.'
      });
    }

    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'workspaceId is required.'
      });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not an active member of this workspace.'
      });
    }

    if (
      workspaceMember.role !== 'OWNER' &&
      workspaceMember.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only Workspace Owners and Admins can perform this action.'
      });
    }

    req.workspaceMember = workspaceMember;

    next();
  } catch (error) {
    next(error);
  }
};