import express from 'express';

import {
  getWorkspaceMembers,
  inviteWorkspaceMember,
  acceptInvitation,
  updateWorkspaceMember,
  removeWorkspaceMember,
  getWorkspaceInvitations,
  revokeInvitation,
  resendInvitation,
  getWorkspaceAuditLogs,
  getWorkspaceActivity,
  getWorkspacePermissions,
  transferMemberTasks,
  getWorkspaceProjects,
  addProjectMember,
  removeProjectMember
} from '../controllers/workspaceMemberController.js';

import { verifyToken } from '../middleware/authMiddleware.js';

import {
  requireWorkspaceMember,
  requireWorkspaceAdmin
} from '../middleware/rbacCustom.js';

import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router({ mergeParams: true });

router.use(apiLimiter);

// ============================================================
// INVITATIONS
// ============================================================

// Accept invitation
// Only authentication is required because the invitation
// itself determines whether the user can join the workspace.
router.post(
  '/invitations/accept',
  verifyToken,
  acceptInvitation
);

// ============================================================
// WORKSPACE MEMBERS
// ============================================================

// View workspace members
// OWNER / ADMIN / MEMBER / GUEST
router.get(
  '/:workspaceId/members',
  verifyToken,
  requireWorkspaceMember,
  getWorkspaceMembers
);

// Update workspace member
// OWNER / ADMIN only
router.patch(
  '/:workspaceId/members/:memberId',
  verifyToken,
  requireWorkspaceAdmin,
  updateWorkspaceMember
);

// Remove workspace member
// OWNER / ADMIN only
router.delete(
  '/:workspaceId/members/:memberId',
  verifyToken,
  requireWorkspaceAdmin,
  removeWorkspaceMember
);

// Transfer tasks from a workspace member
// OWNER / ADMIN only
router.post(
  '/:workspaceId/members/:memberId/transfer-tasks',
  verifyToken,
  requireWorkspaceAdmin,
  transferMemberTasks
);

// ============================================================
// WORKSPACE INVITATIONS
// ============================================================

// Get workspace invitations
// OWNER / ADMIN only
router.get(
  '/:workspaceId/invitations',
  verifyToken,
  requireWorkspaceAdmin,
  getWorkspaceInvitations
);

// Create workspace invitation
// OWNER / ADMIN only
router.post(
  '/:workspaceId/invitations',
  verifyToken,
  requireWorkspaceAdmin,
  inviteWorkspaceMember
);

// Revoke workspace invitation
// OWNER / ADMIN only
router.delete(
  '/:workspaceId/invitations/:inviteId',
  verifyToken,
  requireWorkspaceAdmin,
  revokeInvitation
);

// Resend workspace invitation
// OWNER / ADMIN only
router.post(
  '/:workspaceId/invitations/:inviteId/resend',
  verifyToken,
  requireWorkspaceAdmin,
  resendInvitation
);

// ============================================================
// WORKSPACE AUDIT / ACTIVITY
// ============================================================

// Workspace audit logs
// Active workspace members
router.get(
  '/:workspaceId/audit-logs',
  verifyToken,
  requireWorkspaceMember,
  getWorkspaceAuditLogs
);

// Workspace activity
// Active workspace members
router.get(
  '/:workspaceId/activity',
  verifyToken,
  requireWorkspaceMember,
  getWorkspaceActivity
);

// Workspace permissions
// Active workspace members
router.get(
  '/:workspaceId/permissions',
  verifyToken,
  requireWorkspaceMember,
  getWorkspacePermissions
);

// ============================================================
// WORKSPACE PROJECTS
// ============================================================

// View workspace projects
// Active workspace members
router.get(
  '/:workspaceId/projects',
  verifyToken,
  requireWorkspaceMember,
  getWorkspaceProjects
);

// Add project member
// OWNER / ADMIN only
router.post(
  '/:workspaceId/projects/:projectId/members',
  verifyToken,
  requireWorkspaceAdmin,
  addProjectMember
);

// Remove project member
// OWNER / ADMIN only
router.delete(
  '/:workspaceId/projects/:projectId/members/:projectMemberId',
  verifyToken,
  requireWorkspaceAdmin,
  removeProjectMember
);

export default router;