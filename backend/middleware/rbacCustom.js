import prisma from '../config/prisma.js';


/**
 * ============================================================
 * OBJECT ID VALIDATION
 * ============================================================
 */
export const isValidObjectId = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  return /^[0-9a-fA-F]{24}$/.test(value);
};


/**
 * ============================================================
 * GET OR CREATE WORKSPACE MEMBER
 * ============================================================
 *
 * Returns the active WorkspaceMember belonging to:
 *
 *   userId + workspaceId
 *
 * We intentionally DO NOT create memberships here.
 *
 * Authorization middleware should never silently create
 * permissions/memberships.
 */
export const getWorkspaceMember = async (
  userId,
  workspaceId
) => {
  if (!userId || !workspaceId) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
      status: 'ACTIVE'
    }
  });
};


/**
 * ============================================================
 * REQUIRE WORKSPACE ADMIN OR TEAM LEAD
 * ============================================================
 *
 * This is the middleware used by:
 *
 * POST   /api/teams/:teamId/members
 * PATCH  /api/teams/:teamId/members/:memberId
 * DELETE /api/teams/:teamId/members/:memberId
 * PATCH  /api/teams/:teamId/lead
 * POST   /api/teams/:teamId/archive
 *
 *
 * Permission model:
 *
 * Workspace OWNER
 *      ↓
 * Full team-management access
 *
 * Workspace ADMIN
 *      ↓
 * Full team-management access
 *
 * Team LEAD
 *      ↓
 * Can manage their own team
 *
 * Workspace MEMBER
 *      ↓
 * Cannot manage teams
 */
export const requireWorkspaceAdminOrTeamLead = async (
  req,
  res,
  next
) => {
  try {

    /**
     * --------------------------------------------------------
     * 1. Authentication
     * --------------------------------------------------------
     */
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication is required.'
      });
    }


    /**
     * --------------------------------------------------------
     * 2. Validate teamId
     * --------------------------------------------------------
     */
    const { teamId } = req.params;

    if (!teamId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Team ID is required.'
      });
    }

    if (!isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid team ID format.'
      });
    }


    /**
     * --------------------------------------------------------
     * 3. Find team
     * --------------------------------------------------------
     */
    const team = await prisma.team.findUnique({
      where: {
        id: teamId
      }
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Team not found.'
      });
    }


    /**
     * --------------------------------------------------------
     * 4. Don't allow modifications to archived teams
     * --------------------------------------------------------
     */
    if (team.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Team is archived.'
      });
    }


    /**
     * --------------------------------------------------------
     * 5. Find requester's WorkspaceMember
     * --------------------------------------------------------
     *
     * THIS is the important part.
     *
     * We do not use:
     *
     *   req.user.rbacRole
     *   req.user.teamOwnerId
     *
     * as the source of authorization.
     *
     * We use the actual workspace membership.
     */
    const workspaceMember =
      await prisma.workspaceMember.findFirst({
        where: {
          userId: req.user.id,
          workspaceId: team.workspaceId,
          status: 'ACTIVE'
        }
      });


    /**
     * User isn't a member of this team's workspace.
     */
    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message:
          'You are not an active member of this workspace.'
      });
    }


    /**
     * --------------------------------------------------------
     * 6. Workspace OWNER
     * --------------------------------------------------------
     */
    if (workspaceMember.role === 'OWNER') {

      req.team = team;
      req.workspaceMember = workspaceMember;

      return next();
    }


    /**
     * --------------------------------------------------------
     * 7. Workspace ADMIN
     * --------------------------------------------------------
     */
    if (workspaceMember.role === 'ADMIN') {

      req.team = team;
      req.workspaceMember = workspaceMember;

      return next();
    }


    /**
     * --------------------------------------------------------
     * 8. Team Lead
     * --------------------------------------------------------
     *
     * Normal workspace members can only manage their own
     * team when they have TEAM_LEAD membership.
     */
    const teamMember =
      await prisma.teamMember.findFirst({
        where: {
          teamId,
          workspaceMemberId: workspaceMember.id,
          status: 'ACTIVE'
        }
      });


    /**
     * --------------------------------------------------------
     * 9. Not a team member
     * --------------------------------------------------------
     */
    if (!teamMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message:
          'You do not have permission to manage this team.'
      });
    }


    /**
     * --------------------------------------------------------
     * 10. Team Lead
     * --------------------------------------------------------
     */
    if (teamMember.role === 'TEAM_LEAD') {

      req.team = team;
      req.workspaceMember = workspaceMember;
      req.teamMember = teamMember;

      return next();
    }


    /**
     * --------------------------------------------------------
     * 11. Normal team member
     * --------------------------------------------------------
     */
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message:
        'Only a Workspace Owner, Workspace Admin, or Team Lead can perform this action.'
    });

  } catch (error) {

    console.error(
      '[RBAC] requireWorkspaceAdminOrTeamLead error:',
      error
    );

    next(error);
  }
};


/**
 * ============================================================
 * REQUIRE ACTIVE WORKSPACE MEMBER
 * ============================================================
 *
 * Useful for read-only team operations.
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

    const { workspaceId } = req.params;

    if (
      !workspaceId ||
      workspaceId === 'undefined' ||
      workspaceId === 'null'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Workspace ID is required.'
      });
    }

    if (!isValidObjectId(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Invalid workspace ID format.'
      });
    }

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: req.user.id,
        status: 'ACTIVE'
      },
      include: {
        workspace: true
      }
    });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not an active member of this workspace.'
      });
    }

    req.workspaceMember = workspaceMember;
    req.workspace = workspaceMember.workspace;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * ============================================================
 * REQUIRE WORKSPACE ADMIN
 * ============================================================
 *
 * Useful for workspace-level operations.
 */
export const requireWorkspaceAdmin = async (
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

    const { workspaceId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Workspace ID is required.'
      });
    }

    const workspaceMember =
      await prisma.workspaceMember.findFirst({
        where: {
          userId: req.user.id,
          workspaceId,
          status: 'ACTIVE'
        }
      });

    if (!workspaceMember) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message:
          'You are not an active member of this workspace.'
      });
    }

    if (
      workspaceMember.role !== 'OWNER' &&
      workspaceMember.role !== 'ADMIN'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message:
          'Only Workspace Owners and Admins can perform this action.'
      });
    }

    req.workspaceMember = workspaceMember;

    next();

  } catch (error) {
    console.error(
      '[RBAC] requireWorkspaceAdmin error:',
      error
    );

    next(error);
  }
};