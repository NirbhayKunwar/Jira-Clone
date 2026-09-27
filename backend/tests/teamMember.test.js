import express from 'express';

import {
  getTeam,
  getTeamMembers,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  transferTeamLead,
  archiveTeam
} from '../controllers/teamMemberController.js';

import { verifyToken } from '../middleware/authMiddleware.js';

import {
  requireWorkspaceAdminOrTeamLead
} from '../middleware/rbacCustom.js';

import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Apply API rate limiting to every team-member route.
 */
router.use(apiLimiter);


/**
 * ============================================================
 * GET TEAM DETAILS
 * ============================================================
 *
 * Any authenticated user who has access to the team can view it.
 */
router.get(
  '/:teamId',
  verifyToken,
  getTeam
);


/**
 * ============================================================
 * GET TEAM MEMBERS
 * ============================================================
 *
 * Any authenticated workspace member with access to the team
 * can view the team's members.
 */
router.get(
  '/:teamId/members',
  verifyToken,
  getTeamMembers
);


/**
 * ============================================================
 * ADD MEMBER TO TEAM
 * ============================================================
 *
 * Allowed:
 *   - Workspace OWNER
 *   - Workspace ADMIN
 *   - Team LEAD
 *
 * Request:
 *
 * POST /api/teams/:teamId/members
 *
 * Body:
 * {
 *   "workspaceMemberId": "...",
 *   "role": "FULLSTACK_ENGINEER"
 * }
 */
router.post(
  '/:teamId/members',
  verifyToken,
  requireWorkspaceAdminOrTeamLead,
  addTeamMember
);


/**
 * ============================================================
 * UPDATE TEAM MEMBER ROLE
 * ============================================================
 *
 * PATCH /api/teams/:teamId/members/:memberId
 *
 * Body:
 * {
 *   "role": "BACKEND_DEVELOPER"
 * }
 */
router.patch(
  '/:teamId/members/:memberId',
  verifyToken,
  requireWorkspaceAdminOrTeamLead,
  updateTeamMember
);


/**
 * ============================================================
 * REMOVE TEAM MEMBER
 * ============================================================
 *
 * DELETE /api/teams/:teamId/members/:memberId
 */
router.delete(
  '/:teamId/members/:memberId',
  verifyToken,
  requireWorkspaceAdminOrTeamLead,
  removeTeamMember
);


/**
 * ============================================================
 * TRANSFER TEAM LEAD
 * ============================================================
 *
 * PATCH /api/teams/:teamId/lead
 *
 * Body:
 * {
 *   "newLeadMemberId": "..."
 * }
 */
router.patch(
  '/:teamId/lead',
  verifyToken,
  requireWorkspaceAdminOrTeamLead,
  transferTeamLead
);


/**
 * ============================================================
 * ARCHIVE TEAM
 * ============================================================
 *
 * POST /api/teams/:teamId/archive
 */
router.post(
  '/:teamId/archive',
  verifyToken,
  requireWorkspaceAdminOrTeamLead,
  archiveTeam
);


export default router;