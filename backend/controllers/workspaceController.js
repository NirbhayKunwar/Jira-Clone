import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// Get all workspaces (scoped to user ownership or team membership)
export const getWorkspaces = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized. Session user not found.', 401));
  }

  // Get user details to check if they belong to a team
  let teamOwnerId = null;
  if (prisma.user && typeof prisma.user.findUnique === 'function') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { teamOwnerId: true }
    });
    if (user) {
      teamOwnerId = user.teamOwnerId;
    }
  }

  const ownerIds = [userId];
  if (teamOwnerId) {
    ownerIds.push(teamOwnerId);
  }

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: { in: ownerIds } },
    orderBy: { id: 'asc' }
  });
  
  const mapped = workspaces.map(w => ({
    id: w.id.toString(),
    name: w.name,
    key: w.key,
    template_type: w.templateType,
    board_name: w.boardName,
    description: w.description,
    sprint_duration: w.sprintDuration,
    wip_limit: w.wipLimit,
    created_at: w.createdAt
  }));

  return res.status(200).json({ success: true, data: mapped });
});

// Get workspace by ID (with ownership/membership verification)
export const getWorkspaceById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const workspaceId = parseInt(id);
  if (isNaN(workspaceId)) {
    return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
  }

  const w = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!w) {
    return next(new AppError('Workspace not found.', 404));
  }

  // BOLA authorization check (allow owner and team members of owner)
  if (w.ownerId && w.ownerId !== req.user.id) {
    let authorized = false;
    if (prisma.user && typeof prisma.user.findUnique === 'function') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { teamOwnerId: true }
      });
      if (user && user.teamOwnerId === w.ownerId) {
        authorized = true;
      }
    }
    if (!authorized) {
      return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
    }
  }

  const mapped = {
    id: w.id.toString(),
    name: w.name,
    key: w.key,
    template_type: w.templateType,
    board_name: w.boardName,
    description: w.description,
    sprint_duration: w.sprintDuration,
    wip_limit: w.wipLimit,
    created_at: w.createdAt
  };

  return res.status(200).json({ success: true, data: mapped });
});

// Create a new workspace (linked to owner)
export const createWorkspace = asyncHandler(async (req, res, next) => {
  const { name, key, template_type, board_name, description, sprint_duration, wip_limit } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError('Workspace name is required.', 400));
  }
  const normalizedKey = key.toUpperCase().trim();
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedKey)) {
    return next(new AppError('Project key must start with a letter and consist of 2 to 10 alphanumeric characters.', 400));
  }
  if (!template_type) {
    return next(new AppError('Workspace template type (scrum or kanban) is required.', 400));
  }

  // Create workspace with owner ID
  try {
    const w = await prisma.workspace.create({
      data: {
        name: name.trim(),
        key: normalizedKey,
        templateType: template_type,
        boardName: board_name || `${name} Board`,
        description: description || '',
        sprintDuration: template_type === 'scrum' ? (sprint_duration || 2) : null,
        wipLimit: template_type === 'kanban' ? (wip_limit || 5) : null,
        ownerId: req.user ? req.user.id : null
      }
    });

    console.log(`[WORKSPACE SERVICE] Created workspace via Prisma: ${w.name} (${w.key})`);

    const mapped = {
      id: w.id.toString(),
      name: w.name,
      key: w.key,
      template_type: w.templateType,
      board_name: w.boardName,
      description: w.description,
      sprint_duration: w.sprintDuration,
      wip_limit: w.wipLimit,
      created_at: w.createdAt
    };

    return res.status(201).json({ success: true, message: 'Workspace created successfully.', data: mapped });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new AppError('A project with this key already exists. Please choose a different key.', 400));
    }
    return next(error);
  }
});

// Delete workspace
export const deleteWorkspace = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const workspaceId = parseInt(id);
  if (isNaN(workspaceId)) {
    return next(new AppError('Invalid workspace ID format. Must be an integer.', 400));
  }
  
  const w = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!w) {
    return next(new AppError('Workspace not found.', 404));
  }

  // BOLA authorization check
  if (w.ownerId && w.ownerId !== req.user.id) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
  }

  await prisma.workspace.delete({
    where: { id: workspaceId }
  });

  console.log(`[WORKSPACE SERVICE] Deleted workspace ${id} and all cascading tasks via Prisma.`);
  return res.status(200).json({ success: true, message: 'Workspace and its tasks deleted successfully.' });
});
