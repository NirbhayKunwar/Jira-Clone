import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { addNotification } from './authController.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const createEventSchema = z.object({
  title: z.string().min(1, 'Event title is required'),
  desc: z.string().optional(),
  eventDate: z.string().min(1, 'Event date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format')
});

const hasWorkspaceAccess = async (workspaceOwnerId, userId) => {
  if (!workspaceOwnerId) return true;
  if (workspaceOwnerId === userId) return true;
  if (prisma.user && typeof prisma.user.findUnique === 'function') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamOwnerId: true }
    });
    return user && user.teamOwnerId === workspaceOwnerId;
  }
  return false;
};

// Get all schedule events
export const getEvents = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.query;
  
  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }
  const parsedWorkspaceId = workspaceId;

  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await hasWorkspaceAccess(ws.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. Access to this workspace is denied.', 403));
  }
  
  const events = await prisma.scheduleEvent.findMany({
    where: { workspaceId: parsedWorkspaceId },
    orderBy: { eventDate: 'asc' }
  });

  const mapped = events.map(e => ({
    id: e.id.toString(),
    title: e.title,
    desc: e.descText || '',
    eventDate: e.eventDate,
    startTime: e.startTime || '',
    endTime: e.endTime || '',
    workspaceId: e.workspaceId ? e.workspaceId.toString() : null
  }));

  return res.status(200).json({ success: true, data: mapped });
});

// Create a new schedule event
export const createEvent = asyncHandler(async (req, res, next) => {
  const body = createEventSchema.parse(req.body);
  const { title, desc, eventDate, startTime, endTime, workspaceId } = body;
  const parsedWorkspaceId = workspaceId;

  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (!(await hasWorkspaceAccess(ws.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. Access to this workspace is denied.', 403));
  }

  const e = await prisma.scheduleEvent.create({
    data: {
      title: title.trim(),
      descText: desc || '',
      eventDate,
      startTime: startTime || '',
      endTime: endTime || '',
      workspaceId: parsedWorkspaceId
    }
  });

  const mapped = {
    id: e.id.toString(),
    title: e.title,
    desc: e.descText || '',
    eventDate: e.eventDate,
    startTime: e.startTime || '',
    endTime: e.endTime || '',
    workspaceId: e.workspaceId ? e.workspaceId.toString() : null
  };

  logger.info(`[SCHEDULE SERVICE] Created schedule event: ${e.title} for ${eventDate}`);

  await addNotification(`New event "${title}" was scheduled for ${eventDate}.`, 'calendar', req.user.id);

  return res.status(201).json({ success: true, message: 'Event created successfully.', data: mapped });
});

// Delete a schedule event
export const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid event ID format.', 400));
  }
  const eventId = id;

  const eventCheck = await prisma.scheduleEvent.findUnique({
    where: { id: eventId },
    include: { workspace: true }
  });

  if (!eventCheck) {
    return next(new AppError('Event not found.', 404));
  }

  if (eventCheck.workspace && !(await hasWorkspaceAccess(eventCheck.workspace.ownerId, req.user.id))) {
    return next(new AppError('Forbidden. You do not have access to this event.', 403));
  }

  await prisma.scheduleEvent.delete({
    where: { id: eventId }
  });

  logger.info(`[SCHEDULE SERVICE] Deleted schedule event: ${eventCheck.title}`);

  await addNotification(`Event "${eventCheck.title}" was removed from the schedule.`, 'calendar', req.user.id);

  return res.status(200).json({ success: true, message: 'Event deleted successfully.', data: null });
});


