import prisma from '../config/prisma.js';

export const requireWorkspaceAdminOrTeamLead = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return res.status(404).json({ success: false, message: 'Team not found.' });
    }

    // Check workspace member role
    if (team.workspaceId) {
      const wsMember = await prisma.workspaceMember.findFirst({
        where: { workspaceId: team.workspaceId, userId: req.user.id, status: 'ACTIVE' }
      });
      if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
        return next();
      }
    }

    // Or check if user is the Team Lead
    if (team.teamLeadId === req.user.id) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Forbidden. Workspace Admin or Team Lead status required.' });
  } catch (error) {
    next(error);
  }
};
