import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// Get all schedule events (scoped to workspace ownership)
export const getEvents = asyncHandler(async (req, res, next) => {
  const { workspaceId } = req.query;
  
  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }
  
  const parsedWorkspaceId = parseInt(workspaceId);
  if (isNaN(parsedWorkspaceId)) {
    return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
  }

  // BOLA Authorization Check
  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (ws.ownerId && ws.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
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
  const { title, desc, eventDate, startTime, endTime, workspaceId } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError('Event title is required.', 400));
  }
  if (!eventDate) {
    return next(new AppError('Event date is required.', 400));
  }

  if (!workspaceId) {
    return next(new AppError('Workspace ID is required.', 400));
  }

  const parsedWorkspaceId = parseInt(workspaceId);
  if (isNaN(parsedWorkspaceId)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }

  // BOLA Authorization Check
  const ws = await prisma.workspace.findUnique({
    where: { id: parsedWorkspaceId }
  });

  if (!ws) {
    return next(new AppError('Workspace not found.', 404));
  }

  if (ws.ownerId && ws.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
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

  return res.status(201).json({ success: true, message: 'Event created successfully.', data: mapped });
});

// Delete a schedule event
export const deleteEvent = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const eventId = parseInt(id);
  if (isNaN(eventId)) {
    return next(new AppError('Invalid event ID format.', 400));
  }

  // Retrieve current event to verify workspace owner
  const eventCheck = await prisma.scheduleEvent.findUnique({
    where: { id: eventId },
    include: { workspace: true }
  });

  if (!eventCheck) {
    return next(new AppError('Event not found.', 404));
  }

  if (eventCheck.workspace && eventCheck.workspace.ownerId && eventCheck.workspace.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this event.', 403));
  }

  await prisma.scheduleEvent.delete({
    where: { id: eventId }
  });

  return res.status(200).json({ success: true, message: 'Event deleted successfully.' });
});
