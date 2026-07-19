import prisma from '../config/prisma.js';

export const getMemberProfile = async (req, res, next) => {
  try {
    const { memberId } = req.params; // WorkspaceMember ID

    const member = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: true,
        teamMemberships: {
          where: { status: 'ACTIVE' },
          include: { team: true }
        },
        projectMemberships: {
          include: { project: true }
        }
      }
    });

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    const userId = member.userId;

    // Get Active Tasks Count
    const activeTasks = await prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ['done', 'completed'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get Completed Tasks Count
    const completedTasksCount = await prisma.task.count({
      where: {
        assigneeId: userId,
        status: { in: ['done', 'completed'] }
      }
    });

    // Get member timeline logs
    const activities = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorId: userId },
          { targetUserId: userId }
        ]
      },
      include: {
        actor: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 15
    });

    // Calculate Workload Density
    const activeTasksCount = activeTasks.length;
    let workloadStatus = 'Optimal';
    if (activeTasksCount > 4) {
      workloadStatus = 'Overloaded';
    } else if (activeTasksCount === 0) {
      workloadStatus = 'Idle';
    }

    res.status(200).json({
      success: true,
      data: {
        profile: {
          id: member.id,
          name: member.user.name,
          email: member.user.email,
          role: member.user.role || 'Software Engineer',
          dept: member.user.dept || 'Engineering',
          location: member.user.location || 'Remote',
          githubUrl: member.user.githubUrl,
          linkedinUrl: member.user.linkedinUrl,
          websiteUrl: member.user.websiteUrl,
          otherLinks: member.user.otherLinks,
          workspaceRole: member.role,
          status: member.status,
          joinedAt: member.joinedAt
        },
        teams: member.teamMemberships,
        projects: member.projectMemberships,
        tasks: {
          active: activeTasks,
          activeCount: activeTasksCount,
          completedCount: completedTasksCount,
          workloadStatus
        },
        activities
      }
    });
  } catch (error) {
    next(error);
  }
};
