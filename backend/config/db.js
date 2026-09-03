import prisma from './prisma.js';

let isSeeded = false;

export const initializeDatabase = async () => {
  try {
    console.log('[DATABASE] Verifying MongoDB Atlas connection...');
    await prisma.$connect();
    console.log('[DATABASE] Connected to MongoDB Atlas successfully.');

    // Fast-path for serverless cold starts: connect immediately without blocking
    if (isSeeded) return;

    // Run seeding asynchronously in background without blocking serverless function boot
    isSeeded = true;
    runSeedingLogic().catch(err => console.error('[DATABASE SEED ERROR]', err));
  } catch (error) {
    console.error('[DATABASE] Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
};

async function runSeedingLogic() {
  try {
    // Self-healing: Drop legacy single-field unique index key_1 on workspaces if present
    try {
      await prisma.$runCommandRaw({
        dropIndexes: 'workspaces',
        index: 'key_1'
      });
      console.log('[DATABASE] Self-healed: Dropped legacy global unique index key_1 on workspaces collection.');
    } catch (indexErr) {
      // Legacy index already dropped or non-existent
    }

    // Self-healing: promote all existing standalone users (no teamOwnerId) to ADMIN
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

    // Seed Permissions
    const permissionsToSeed = [
      { name: 'workspace.manage', description: 'Manage workspace configuration' },
      { name: 'workspace.delete', description: 'Delete the workspace' },
      { name: 'workspace.invite', description: 'Invite users to workspace' },
      { name: 'workspace.manage_members', description: 'Add/remove/change member roles' },
      { name: 'workspace.manage_projects', description: 'Create and manage workspace projects' },
      { name: 'workspace.manage_teams', description: 'Create and manage workspace teams' },
      { name: 'team.manage', description: 'Manage team details and settings' },
      { name: 'team.invite', description: 'Add members to team' },
      { name: 'sprint.manage', description: 'Create and manage sprints' },
      { name: 'task.assign', description: 'Assign tasks to members' },
      { name: 'task.delete', description: 'Permanently delete tasks' },
      { name: 'comment.create', description: 'Post comments on tasks' }
    ];

    for (const p of permissionsToSeed) {
      await prisma.permission.upsert({
        where: { name: p.name },
        update: { description: p.description },
        create: { name: p.name, description: p.description }
      });
    }

    // Map default permissions to OWNER/ADMIN WorkspaceRoles
    const allPerms = await prisma.permission.findMany();
    for (const wp of allPerms) {
      const existingOwnerPerm = await prisma.workspaceRolePermission.findFirst({
        where: { role: 'OWNER', permissionId: wp.id }
      });
      if (!existingOwnerPerm) {
        await prisma.workspaceRolePermission.create({
          data: { role: 'OWNER', permissionId: wp.id }
        });
      }

      if (wp.name !== 'workspace.delete') {
        const existingAdminPerm = await prisma.workspaceRolePermission.findFirst({
          where: { role: 'ADMIN', permissionId: wp.id }
        });
        if (!existingAdminPerm) {
          await prisma.workspaceRolePermission.create({
            data: { role: 'ADMIN', permissionId: wp.id }
          });
        }
      }

      if (['workspace.invite', 'sprint.manage', 'task.assign', 'comment.create'].includes(wp.name)) {
        const existingMemberPerm = await prisma.workspaceRolePermission.findFirst({
          where: { role: 'MEMBER', permissionId: wp.id }
        });
        if (!existingMemberPerm) {
          await prisma.workspaceRolePermission.create({
            data: { role: 'MEMBER', permissionId: wp.id }
          });
        }
      }

      if (wp.name === 'comment.create') {
        const existingGuestPerm = await prisma.workspaceRolePermission.findFirst({
          where: { role: 'GUEST', permissionId: wp.id }
        });
        if (!existingGuestPerm) {
          await prisma.workspaceRolePermission.create({
            data: { role: 'GUEST', permissionId: wp.id }
          });
        }
      }
    }

    const teamPerms = await prisma.permission.findMany({
      where: { name: { in: ['team.manage', 'team.invite'] } }
    });
    for (const tp of teamPerms) {
      const existingTeamLeadPerm = await prisma.teamRolePermission.findFirst({
        where: { role: 'TEAM_LEAD', permissionId: tp.id }
      });
      if (!existingTeamLeadPerm) {
        await prisma.teamRolePermission.create({
          data: { role: 'TEAM_LEAD', permissionId: tp.id }
        });
      }
    }

    console.log('[DATABASE] Seeded permission models and defaults successfully.');
  } catch (err) {
    console.error('[DATABASE SEED ERROR]', err);
  }
}
