import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController.js';
import prisma from '../config/prisma.js';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      goal: {
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

describe('Goal Controller BOLA and CRUD tests', () => {
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

  it('should get all goals successfully', async () => {
    prisma.goal.findMany.mockResolvedValue([
      { id: '60c72b2f9b1d8e001c888882', title: 'Learn Vitest', descText: '', owner: 'You', targetDate: '', progress: 50, status: 'on_track', ownerId: '60c72b2f9b1d8e001c888881' }
    ]);

    await getGoals(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should create goal successfully', async () => {
    req.body = { title: 'Release Version 1.0' };
    prisma.goal.create.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      title: 'Release Version 1.0',
      descText: '',
      owner: 'You',
      targetDate: '',
      progress: 0,
      status: 'on_track',
      ownerId: '60c72b2f9b1d8e001c888881'
    });

    await createGoal(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Goal created successfully.'
    }));
  });

  it('should return 403 on goal deletion if owned by another user', async () => {
    req.params.id = '60c72b2f9b1d8e001c888883';
    prisma.goal.findUnique.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      ownerId: '60c72b2f9b1d8e001c888884'
    });

    await deleteGoal(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this goal.'
    }));
  });
});

