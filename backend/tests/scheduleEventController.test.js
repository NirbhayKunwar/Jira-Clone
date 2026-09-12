import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEvents, createEvent, deleteEvent } from '../controllers/scheduleEventController.js';
import prisma from '../config/prisma.js';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      workspace: {
        findUnique: vi.fn(),
      },
      workspaceMember: {
        findFirst: vi.fn(),
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
      user: { id: '60c72b2f9b1d8e001c888881', email: 'test@example.com' }
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
      workspaceId: '60c72b2f9b1d8e001c888882'
    };

    prisma.workspace.findUnique.mockResolvedValue({ id: '60c72b2f9b1d8e001c888882', ownerId: '60c72b2f9b1d8e001c888881' });
    prisma.scheduleEvent.create.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      title: 'Sprint Demo Meeting',
      eventDate: '2026-07-06',
      workspaceId: '60c72b2f9b1d8e001c888882',
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
    req.params.id = '60c72b2f9b1d8e001c888883';

    prisma.scheduleEvent.findUnique.mockResolvedValue({
      id: '60c72b2f9b1d8e001c888883',
      workspace: { ownerId: '60c72b2f9b1d8e001c888884' }
    });

    await deleteEvent(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 403,
      message: 'Forbidden. You do not have access to this event.'
    }));
  });
});

