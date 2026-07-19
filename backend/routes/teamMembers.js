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
import { requireWorkspaceAdminOrTeamLead } from '../middleware/rbacCustom.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/:teamId', verifyToken, getTeam);
router.get('/:teamId/members', verifyToken, getTeamMembers);

// Modifications require Admin or Team Lead status
router.post('/:teamId/members', verifyToken, requireWorkspaceAdminOrTeamLead, addTeamMember);
router.patch('/:teamId/members/:memberId', verifyToken, requireWorkspaceAdminOrTeamLead, updateTeamMember);
router.delete('/:teamId/members/:memberId', verifyToken, requireWorkspaceAdminOrTeamLead, removeTeamMember);
router.patch('/:teamId/lead', verifyToken, requireWorkspaceAdminOrTeamLead, transferTeamLead);
router.post('/:teamId/archive', verifyToken, requireWorkspaceAdminOrTeamLead, archiveTeam);

export default router;
