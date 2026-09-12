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
import { requireWorkspaceRole } from '../middleware/rbac.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router({ mergeParams: true });

router.use(apiLimiter);

// Accept invitation (only require authentication)
router.post('/invitations/accept', verifyToken, acceptInvitation);

// Workspace specific endpoints
router.get('/:workspaceId/members', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']), getWorkspaceMembers);
router.patch('/:workspaceId/members/:memberId', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), updateWorkspaceMember);
router.delete('/:workspaceId/members/:memberId', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), removeWorkspaceMember);
router.post('/:workspaceId/members/:memberId/transfer-tasks', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), transferMemberTasks);

router.get('/:workspaceId/invitations', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), getWorkspaceInvitations);
router.post('/:workspaceId/invitations', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), inviteWorkspaceMember);
router.delete('/:workspaceId/invitations/:inviteId', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), revokeInvitation);
router.post('/:workspaceId/invitations/:inviteId/resend', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), resendInvitation);

router.get('/:workspaceId/audit-logs', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER']), getWorkspaceAuditLogs);
router.get('/:workspaceId/activity', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']), getWorkspaceActivity);
router.get('/:workspaceId/permissions', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']), getWorkspacePermissions);
router.get('/:workspaceId/projects', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN', 'MEMBER', 'GUEST']), getWorkspaceProjects);
router.post('/:workspaceId/projects/:projectId/members', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), addProjectMember);
router.delete('/:workspaceId/projects/:projectId/members/:projectMemberId', verifyToken, requireWorkspaceRole(['OWNER', 'ADMIN']), removeProjectMember);

export default router;
