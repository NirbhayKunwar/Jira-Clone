import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';
import prisma from '../config/prisma.js';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      team: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn()
      }
    }
  };
});

vi.mock('../middleware/errorHandler.js', () => {
  return {
    asyncHandler: (fn) => fn,
    AppError: class extends Error {
      constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
      }
    }
  };
});

describe('Team Controller BOLA and CRUD tests', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      params: {},
      user: { id: 1, email: 'test@example.com' }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('should get all teams successfully', async () => {
    prisma.team.findMany.mockResolvedValue([
      { id: 1, name: 'QA Team', descText: '', membersText: '[]', ownerId: 1 }
    ]);

    await getTeams(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should create team successfully', async () => {
    req.body = { name: 'DevOps Team' };
    prisma.team.create.mockResolvedValue({
      id: 2,
      name: 'DevOps Team',
      descText: '',
      membersText: '[]',
      ownerId: 1
    });

    await createTeam(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Team created successfully.'
    }));
  });

  it('should return 403 on team deletion if owned by another user', async () => {
    req.params.id = '2';
    prisma.team.findUnique.mockResolvedValue({
      id: 2,
      ownerId: 2
    });

    await deleteTeam(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this team.'
    }));
  });
});
