import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/taskController.js';
import prisma from '../config/prisma.js';

// Mock the prisma config module
vi.mock('../config/prisma.js', () => {
  return {
    default: {
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
      }
    }
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
      user: { id: 1, email: 'test@example.com' }
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
    req.query.workspaceId = '1';
    
    prisma.workspace.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
    prisma.task.findMany.mockResolvedValue([
      { id: 10, title: 'Task 1', descText: 'Desc', status: 'todo', priority: 'High', epic: 'General', assigneeId: 1, workspaceId: 1, createdAt: new Date(), completedAt: null }
    ]);

    await getTasks(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true
    }));
  });

  it('should return 403 if user does not own the workspace in getTasks', async () => {
    req.query.workspaceId = '1';
    
    prisma.workspace.findUnique.mockResolvedValue({ id: 1, ownerId: 2 });

    await getTasks(req, res, next);
    
    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this workspace.'
    }));
  });

  it('should return 403 if user updates a task inside a workspace they do not own', async () => {
    req.params.id = '10';
    req.body = { status: 'done' };

    prisma.task.findUnique.mockResolvedValue({
      id: 10,
      workspace: { ownerId: 2 }
    });

    await updateTask(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this task.'
    }));
  });
});
