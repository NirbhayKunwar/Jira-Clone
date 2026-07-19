import prisma from './prisma.js';

export const initializeDatabase = async () => {
  try {
    console.log('[DATABASE] Verifying MongoDB Atlas connection...');
    await prisma.$connect();
    console.log('[DATABASE] Connected to MongoDB Atlas successfully.');

    // Self-healing: promote all existing standalone users (no teamOwnerId) to ADMIN
    // so they are not locked out of creating workspaces or inviting members.
    const standaloneMembers = await prisma.user.findMany({
      where: { rbacRole: 'MEMBER' },
      select: { id: true, teamOwnerId: true }
    });

    const toPromote = standaloneMembers.filter(u => u.teamOwnerId === null || u.teamOwnerId === undefined);
    if (toPromote.length > 0) {
      const ids = toPromote.map(u => u.id);
      const updateResult = await prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { rbacRole: 'ADMIN' }
      });
      console.log(`[DATABASE] Self-healed: Promoted ${updateResult.count} standalone users from MEMBER to ADMIN.`);
    }
  } catch (error) {
    console.error('[DATABASE] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};
