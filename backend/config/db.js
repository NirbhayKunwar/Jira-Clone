import prisma from './prisma.js';

export const initializeDatabase = async () => {
  try {
    console.log('[DATABASE] Verifying MongoDB Atlas connection...');
    await prisma.$connect();
    console.log('[DATABASE] Connected to MongoDB Atlas successfully.');

    // Self-healing: promote all existing standalone users (no teamOwnerId) to ADMIN
    // so they are not locked out of creating workspaces or inviting members.
    const updateResult = await prisma.user.updateMany({
      where: {
        teamOwnerId: null,
        rbacRole: 'MEMBER'
      },
      data: {
        rbacRole: 'ADMIN'
      }
    });
    if (updateResult.count > 0) {
      console.log(`[DATABASE] Self-healed: Promoted ${updateResult.count} standalone users from MEMBER to ADMIN.`);
    }
  } catch (error) {
    console.error('[DATABASE] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};
