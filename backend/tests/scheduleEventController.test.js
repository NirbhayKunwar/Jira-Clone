import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEvents, createEvent, deleteEvent } from '../controllers/scheduleEventController.js';
import prisma from '../config/prisma.js';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      workspace: {
        findUnique: vi.fn(),
      },
      scheduleEvent: {
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
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

describe('ScheduleEvent Controller BOLA and CRUD tests', () => {
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

  it('should create event successfully for authorized workspace', async () => {
    req.body = {
      title: 'Sprint Demo Meeting',
      eventDate: '2026-07-06',
      workspaceId: '1'
    };

    prisma.workspace.findUnique.mockResolvedValue({ id: 1, ownerId: 1 });
    prisma.scheduleEvent.create.mockResolvedValue({
      id: 5,
      title: 'Sprint Demo Meeting',
      eventDate: '2026-07-06',
      workspaceId: 1,
      createdAt: new Date()
    });

    await createEvent(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Event created successfully.'
    }));
  });

  it('should return 403 on event deletion if workspace is owned by someone else', async () => {
    req.params.id = '5';

    prisma.scheduleEvent.findUnique.mockResolvedValue({
      id: 5,
      workspace: { ownerId: 2 }
    });

    await deleteEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this event.'
    }));
  });
});
