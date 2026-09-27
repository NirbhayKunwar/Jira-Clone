import { describe, it, expect, vi, beforeEach } from 'vitest';

import { updateProfile } from '../controllers/authController.js';
import { addTeamMember } from '../controllers/teamMemberController.js';
import prisma from '../config/prisma.js';

/*
 * ============================================================================
 * Prisma Mock
 * ============================================================================
 */

vi.mock('../config/prisma.js', () => ({
  default: {
    user: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },

    team: {
      findUnique: vi.fn(),
      update: vi.fn()
    },

    workspaceMember: {
      findUnique: vi.fn(),
      findFirst: vi.fn()
    },

    teamMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },

    auditLog: {
      create: vi.fn()
    },

    $transaction: vi.fn()
  }
}));

/*
 * ============================================================================
 * Event Bus Mock
 * ============================================================================
 */

vi.mock('../config/eventBus.js', () => ({
  default: {
    emit: vi.fn()
  }
}));

/*
 * ============================================================================
 * RBAC Mock
 * ============================================================================
 */

vi.mock('../middleware/rbac.js', () => ({
  isValidObjectId: vi.fn(() => true)
}));

/*
 * ============================================================================
 * Tests
 * ============================================================================
 */

describe('Auth Controller Profile and Team Member tests', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      body: {
        name: 'Audit User'
      },

      user: {
        id: '60c72b2f9b1d8e001c888881',
        email: 'test@example.com'
      },

      params: {},

      ip: '127.0.0.1',

      connection: {
        remoteAddress: '127.0.0.1'
      },

      headers: {
        'user-agent': 'Chrome'
      }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    next = vi.fn();
  });

  /*
   * ==========================================================================
   * updateProfile
   * ==========================================================================
   */

  describe('updateProfile', () => {
    it('should update profile successfully and return formatted payload', async () => {
      prisma.user.update.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888881',
        name: 'Audit User',
        email: 'test@example.com',
        role: 'QA Engineer',
        dept: 'Core',
        location: 'London',
        githubUrl: '',
        linkedinUrl: '',
        websiteUrl: '',
        otherLinks: '',
        hasConfiguredWorkspace: true
      });

      await updateProfile(req, res, next);

      expect(prisma.user.update).toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Profile details updated successfully.'
        })
      );

      expect(next).not.toHaveBeenCalled();
    });

    it('should return 400 if name is empty', async () => {
      req.body.name = '';

      await updateProfile(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Name cannot be empty.'
        })
      );

      expect(prisma.user.update).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });
  });

  /*
   * ==========================================================================
   * addTeamMember
   * ==========================================================================
   */

  describe('addTeamMember', () => {
    const teamId = '60c72b2f9b1d8e001c888883';

    const workspaceMemberId = '60c72b2f9b1d8e001c888884';

    const workspaceId = '60c72b2f9b1d8e001c888885';

    beforeEach(() => {
      req.params = {
        teamId
      };

      req.body = {
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER'
      };
    });

    it('should add an active workspace member to a team successfully', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: workspaceMemberId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.teamMember.findFirst.mockResolvedValue(null);

      prisma.teamMember.create.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888886',
        teamId,
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER',
        status: 'ACTIVE'
      });

      await addTeamMember(req, res, next);

      expect(prisma.team.findUnique).toHaveBeenCalledWith({
        where: {
          id: teamId
        }
      });

      expect(prisma.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          id: workspaceMemberId
        }
      });

      expect(prisma.teamMember.findFirst).toHaveBeenCalledWith({
        where: {
          teamId,
          workspaceMemberId,
          status: 'ACTIVE'
        }
      });

      expect(prisma.teamMember.create).toHaveBeenCalledWith({
        data: {
          teamId,
          workspaceMemberId,
          role: 'FULLSTACK_ENGINEER',
          status: 'ACTIVE'
        }
      });

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Workspace member added to team successfully.',
          data: {
            id: '60c72b2f9b1d8e001c888886',
            teamId,
            workspaceMemberId,
            role: 'FULLSTACK_ENGINEER',
            status: 'ACTIVE'
          }
        })
      );

      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when the team does not exist', async () => {
      prisma.team.findUnique.mockResolvedValue(null);

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team not found or archived.'
      });

      expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should return 404 when the team is archived', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ARCHIVED'
      });

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Team not found or archived.'
      });

      expect(prisma.workspaceMember.findUnique).not.toHaveBeenCalled();

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject an inactive workspace member', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: workspaceMemberId,
        workspaceId,
        status: 'INACTIVE'
      });

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message:
          'Only active Workspace Members belonging to the team workspace can be added.'
      });

      expect(prisma.teamMember.findFirst).not.toHaveBeenCalled();

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject a workspace member belonging to another workspace', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: workspaceMemberId,
        workspaceId: 'different-workspace-id',
        status: 'ACTIVE'
      });

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message:
          'Only active Workspace Members belonging to the team workspace can be added.'
      });

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject a duplicate active team member', async () => {
      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: workspaceMemberId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.teamMember.findFirst.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888886',
        teamId,
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER',
        status: 'ACTIVE'
      });

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Member is already an active member of this team.'
      });

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject direct TEAM_LEAD assignment', async () => {
      req.body.role = 'TEAM_LEAD';

      prisma.team.findUnique.mockResolvedValue({
        id: teamId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.workspaceMember.findUnique.mockResolvedValue({
        id: workspaceMemberId,
        workspaceId,
        status: 'ACTIVE'
      });

      prisma.teamMember.findFirst.mockResolvedValue(null);

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message:
          'A team can only have exactly one Team Lead. Please use the Lead Transfer endpoint.'
      });

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });

    it('should reject an invalid request body', async () => {
      req.body = {};

      await addTeamMember(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );

      expect(prisma.team.findUnique).not.toHaveBeenCalled();

      expect(prisma.teamMember.create).not.toHaveBeenCalled();

      expect(next).not.toHaveBeenCalled();
    });
  });
});