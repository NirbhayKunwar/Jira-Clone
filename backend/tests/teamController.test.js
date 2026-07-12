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
      user: { id: '60c72b2f9b1d8e001c888881', email: 'test@example.com' }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('should get all teams successfully', async () => {
    prisma.team.findMany.mockResolvedValue([
      { id: '60c72b2f9b1d8e001c888882', name: 'QA Team', descText: '', membersText: '[]', ownerId: '60c72b2f9b1d8e001c888881' }
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
      id: '60c72b2f9b1d8e001c888883',
      name: 'DevOps Team',
      descText: '',
      membersText: '[]',
      ownerId: '60c72b2f9b1d8e001c888881'
    });

    await createTeam(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Team created successfully.'
    }));
  });

  it('should return 403 on team deletion if owned by another user', async () => {
    req.params.id = '60c72b2f9b1d8e001c888883';
    prisma.team.findUnique.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      ownerId: '60c72b2f9b1d8e001c888884'
    });

    await deleteTeam(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this team.'
    }));
  });
});

