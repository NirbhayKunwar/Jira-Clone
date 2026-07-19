import prisma from '../config/prisma.js';
import { getOrCreateWorkspaceMember, isValidObjectId } from './rbac.js';

export const requireWorkspaceAdminOrTeamLead = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    if (!teamId || !isValidObjectId(teamId)) {
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

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.status === 'ARCHIVED') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        reason: 'Team not found or archived.'
      });
    }

    // Check workspace member role via self-healing loader
    if (team.workspaceId) {
      const wsMember = await getOrCreateWorkspaceMember(team.workspaceId, req.user.id);
      if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
        return next();
      }
    }

    // Or check if user is the Team Lead
    if (team.teamLeadId === req.user.id) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      reason: 'Workspace Admin or Team Lead status required.',
      teamId
    });
  } catch (error) {
    next(error);
  }
};
