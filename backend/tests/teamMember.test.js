import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll
} from 'vitest';

import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import prisma from '../config/prisma.js';

describe('Team Member API', () => {
  let workspaceId;
  let teamId;
  let workspaceMemberId;
  let userId;
  let teamMemberId;
  let authToken;

  /*
   * ==========================================================================
   * SETUP
   * ==========================================================================
   */

  beforeAll(async () => {
    /*
     * Create test user
     */

const user = await prisma.user.create({
  data: {
    name: 'Team Member Test User',
    email: `team-member-test-${Date.now()}@example.com`,
    password: 'hashed'
  }
});

userId = user.id;

authToken = jwt.sign(
  {
    id: user.id,
    tokenVersion: user.tokenVersion
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '1h'
  }
);

    /*
     * Create workspace
     */

const workspace = await prisma.workspace.create({
  data: {
    name: 'Team Member Test Workspace',
    key: `TST${Date.now()}`,
    templateType: 'CUSTOM',
    boardName: 'Team Member Test Board'
  }
});

    workspaceId = workspace.id;

    /*
     * Create WorkspaceMember
     *
     * IMPORTANT:
     * The real addTeamMember controller expects this record
     * to already exist.
     */

    const workspaceMember =
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId,
          role: 'ADMIN',
          status: 'ACTIVE'
        }
      });

    workspaceMemberId = workspaceMember.id;

    /*
     * Create team
     */

    const team = await prisma.team.create({
      data: {
        name: 'Team Member Test Team',
        workspaceId,
        status: 'ACTIVE'
      }
    });

    teamId = team.id;
  });

  /*
   * ==========================================================================
   * CLEANUP
   * ==========================================================================
   */

  afterAll(async () => {
    /*
     * Delete team members
     */

    if (teamId) {
      await prisma.teamMember.deleteMany({
        where: {
          teamId
        }
      });
    }

    /*
     * Delete team
     */

    if (teamId) {
      await prisma.team.deleteMany({
        where: {
          id: teamId
        }
      });
    }

    /*
     * Delete workspace member
     */

    if (workspaceMemberId) {
      await prisma.workspaceMember.deleteMany({
        where: {
          id: workspaceMemberId
        }
      });
    }

    /*
     * Delete workspace
     */

    if (workspaceId) {
      await prisma.workspace.deleteMany({
        where: {
          id: workspaceId
        }
      });
    }

    /*
     * Delete user
     */

    if (userId) {
      await prisma.user.deleteMany({
        where: {
          id: userId
        }
      });
    }
  });

  /*
   * ==========================================================================
   * ADD TEAM MEMBER
   * ==========================================================================
   */

  test('addTeamMember adds an existing workspace member to a team', async () => {
    const response = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER'
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);

    expect(response.body.message).toBe(
      'Workspace member added to team successfully.'
    );

    expect(response.body.data).toBeDefined();

    expect(response.body.data.id).toBeDefined();

    expect(response.body.data.teamId).toBe(teamId);

    expect(response.body.data.workspaceMemberId).toBe(
      workspaceMemberId
    );

    expect(response.body.data.role).toBe(
      'FULLSTACK_ENGINEER'
    );

    expect(response.body.data.status).toBe('ACTIVE');

    teamMemberId = response.body.data.id;

    /*
     * Verify database record
     */

    const teamMember =
      await prisma.teamMember.findUnique({
        where: {
          id: teamMemberId
        }
      });

    expect(teamMember).toBeTruthy();

    expect(teamMember.teamId).toBe(teamId);

    expect(teamMember.workspaceMemberId).toBe(
      workspaceMemberId
    );

    expect(teamMember.role).toBe(
      'FULLSTACK_ENGINEER'
    );

    expect(teamMember.status).toBe('ACTIVE');
  });

  /*
   * ==========================================================================
   * DUPLICATE MEMBER
   * ==========================================================================
   */

  test('addTeamMember rejects duplicate active membership', async () => {
    const response = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER'
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      'Member is already an active member of this team.'
    );
  });

  /*
   * ==========================================================================
   * INVALID WORKSPACE MEMBER
   * ==========================================================================
   */

  test('addTeamMember rejects a workspace member that does not exist', async () => {
    /*
     * Use a valid-looking ObjectId that does not exist.
     */

    const fakeWorkspaceMemberId =
      '60c72b2f9b1d8e001c999999';

    const response = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        workspaceMemberId: fakeWorkspaceMemberId,
        role: 'FULLSTACK_ENGINEER'
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      'Only active Workspace Members belonging to the team workspace can be added.'
    );
  });

  /*
   * ==========================================================================
   * TEAM LEAD RESTRICTION
   * ==========================================================================
   */

  test('addTeamMember rejects direct TEAM_LEAD assignment', async () => {
    /*
     * Create another user.
     */

    const secondUser = await prisma.user.create({
      data: {
        name: 'Second Team Member Test User',
        email: `team-member-test-second-${Date.now()}@example.com`,
        password: 'hashed'
      }
    });

    /*
     * Create another workspace member.
     */

    const secondWorkspaceMember =
      await prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: secondUser.id,
          role: 'MEMBER',
          status: 'ACTIVE'
        }
      });

    const response = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        workspaceMemberId: secondWorkspaceMember.id,
        role: 'TEAM_LEAD'
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.message).toBe(
      'A team can only have exactly one Team Lead. Please use the Lead Transfer endpoint.'
    );

    /*
     * Cleanup second user/member.
     */

    await prisma.workspaceMember.deleteMany({
      where: {
        id: secondWorkspaceMember.id
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: secondUser.id
      }
    });
  });

  /*
   * ==========================================================================
   * UPDATE TEAM MEMBER ROLE
   * ==========================================================================
   */

  test('updateTeamMember rejects direct promotion to TEAM_LEAD', async () => {
    /*
     * The first test should already have created this member.
     *
     * If it did not, create it.
     */

    let member;

    if (teamMemberId) {
      member = await prisma.teamMember.findUnique({
        where: {
          id: teamMemberId
        }
      });
    }

    if (!member) {
      member = await prisma.teamMember.create({
        data: {
          teamId,
          workspaceMemberId,
          role: 'FULLSTACK_ENGINEER',
          status: 'ACTIVE'
        }
      });

      teamMemberId = member.id;
    }

    const response = await request(app)
      .patch(
        `/api/teams/${teamId}/members/${teamMemberId}`
      )
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        role: 'TEAM_LEAD'
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toMatch(
      /transfer lead/i
    );
  });

  /*
   * ==========================================================================
   * INVALID REQUEST BODY
   * ==========================================================================
   */

  test('addTeamMember rejects an invalid request body', async () => {
    const response = await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({});

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);

    expect(response.body.errors).toBeDefined();
  });

  /*
   * ==========================================================================
   * ARCHIVED TEAM
   * ==========================================================================
   */

  test('addTeamMember rejects an archived team', async () => {
    /*
     * Create a separate team so we don't break the other tests.
     */

    const archivedTeam = await prisma.team.create({
      data: {
        name: 'Archived Test Team',
        workspaceId,
        status: 'ARCHIVED'
      }
    });

    const response = await request(app)
      .post(`/api/teams/${archivedTeam.id}/members`)
      .set(
        'Authorization',
        `Bearer ${authToken}`
      )
      .send({
        workspaceMemberId,
        role: 'FULLSTACK_ENGINEER'
      });

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);

    expect(response.body.reason).toBe(
      'Team not found or archived.'
    );

    /*
     * Cleanup archived team.
     */

    await prisma.team.deleteMany({
      where: {
        id: archivedTeam.id
      }
    });
  });
});