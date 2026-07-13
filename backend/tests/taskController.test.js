import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, createTask, updateTask, deleteTask, claimTask } from '../controllers/taskController.js';
import prisma from '../config/prisma.js';

// Mock the prisma config module
vi.mock('../config/prisma.js', () => {
  const mockPrisma = {
    workspace: {
      findUnique: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn()
  };
  mockPrisma.$transaction.mockImplementation((cb) => cb(mockPrisma));
  return {
    default: mockPrisma
  };
});

// Mock the errorHandler middleware to return the underlying promise directly for testing
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

describe('Task Controller BOLA and CRUD tests', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
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

  it('should return 400 if workspaceId is missing in getTasks', async () => {
    await getTasks(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message: 'Workspace ID is required.'
    }));
  });

  it('should get all tasks successfully if workspace exists and user has access', async () => {
    req.query.workspaceId = '60c72b2f9b1d8e001c888882';
    
    prisma.workspace.findUnique.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888882',
      ownerId: '60c72b2f9b1d8e001c888881',
      tasks: [
        { id: '60c72b2f9b1d8e001c888883', title: 'Task 1', descText: 'Desc', status: 'todo', priority: 'High', epic: 'General', assigneeId: '60c72b2f9b1d8e001c888881', workspaceId: '60c72b2f9b1d8e001c888882', createdAt: new Date(), completedAt: null, assignee: { name: 'Test User' } }
      ]
    });

    await getTasks(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should return 403 if user does not own the workspace in getTasks', async () => {
    req.query.workspaceId = '60c72b2f9b1d8e001c888882';
    
    prisma.workspace.findUnique.mockResolvedValue({ id: '60c72b2f9b1d8e001c888882', ownerId: '60c72b2f9b1d8e001c888884' });

    await getTasks(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this workspace.'
    }));
  });

  it('should return 403 if user updates a task inside a workspace they do not own', async () => {
    req.params.id = '60c72b2f9b1d8e001c888883';
    req.body = { status: 'done' };

    prisma.task.findUnique.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      workspace: { ownerId: '60c72b2f9b1d8e001c888884' }
    });

    await updateTask(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this task.'
    }));
  });
});

