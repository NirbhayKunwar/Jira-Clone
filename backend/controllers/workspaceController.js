import { z } from 'zod';
import prisma from '../config/prisma.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

// Request Validation Schemas
const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Project key must start with a letter and consist of 2 to 10 alphanumeric characters'),
  template_type: z.enum(['scrum', 'kanban']),
  board_name: z.string().optional(),
  description: z.string().optional(),
  sprint_duration: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform(val => (val === null || val === undefined) ? undefined : (typeof val === 'string' ? parseInt(val) : val))
    .optional(),
  wip_limit: z.union([z.number(), z.string(), z.null(), z.undefined()])
    .transform(val => (val === null || val === undefined) ? undefined : (typeof val === 'string' ? parseInt(val) : val))
    .optional()
});

// Get all workspaces (scoped strictly to active WorkspaceMember entries)
export const getWorkspaces = asyncHandler(async (req, res, next) => {
  const userId = req.user ? req.user.id : null;
  if (!userId) {
    return next(new AppError('Unauthorized. Session user not found.', 401));
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId,
      status: 'ACTIVE'
    },
    include: {
      workspace: true
    }
  });

  const workspaces = memberships.map(m => m.workspace).filter(Boolean);
  
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

// Get workspace by ID (with membership verification)
export const getWorkspaceById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }
  const workspaceId = id;

  const w = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!w) {
    return next(new AppError('Workspace not found.', 404));
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: req.user.id,
      status: 'ACTIVE'
    }
  });

  if (!member) {
    return next(new AppError('Forbidden. You do not have access to this workspace.', 403));
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
    created_at: w.createdAt,
    createdAt: w.createdAt
  };

  return res.status(200).json({ success: true, data: mapped });
});

// Create a new workspace (linked to owner and auto-creating membership)
export const createWorkspace = asyncHandler(async (req, res, next) => {
  const body = createWorkspaceSchema.parse(req.body);
  const { name, key, template_type, board_name, description, sprint_duration, wip_limit } = body;
  const normalizedKey = key.toUpperCase().trim();

  try {
    const { w } = await prisma.$transaction(async (tx) => {
      const workspaceRecord = await tx.workspace.create({
        data: {
          name: name.trim(),
          key: normalizedKey,
          templateType: template_type,
          boardName: board_name || `${name} Board`,
          description: description || '',
          sprintDuration: template_type === 'scrum' ? (sprint_duration || 2) : null,
          wipLimit: template_type === 'kanban' ? (wip_limit || 5) : null,
          ownerId: req.user.id
        }
      });

      const primaryProject = await tx.project.create({
        data: {
          name: name.trim(),
          key: normalizedKey,
          workspaceId: workspaceRecord.id
        }
      });

      const memberRecord = await tx.workspaceMember.create({
        data: {
          workspaceId: workspaceRecord.id,
          userId: req.user.id,
          role: 'OWNER',
          status: 'ACTIVE'
        }
      });

      await tx.projectMember.create({
        data: {
          projectId: primaryProject.id,
          workspaceMemberId: memberRecord.id,
          role: 'PROJECT_LEAD'
        }
      });

      return { w: workspaceRecord };
    });

    logger.info(`[WORKSPACE SERVICE] Created workspace and membership via Prisma transaction: ${w.name} (${w.key})`);

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

// Delete workspace (Only Owner)
export const deleteWorkspace = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return next(new AppError('Invalid workspace ID format.', 400));
  }
  const workspaceId = id;
  
  const w = await prisma.workspace.findUnique({
    where: { id: workspaceId }
  });

  if (!w) {
    return next(new AppError('Workspace not found.', 404));
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId: req.user.id,
      role: 'OWNER',
      status: 'ACTIVE'
    }
  });

  if (!member) {
    return next(new AppError('Forbidden. Only the Workspace Owner can delete this workspace.', 403));
  }

  await prisma.workspace.delete({
    where: { id: workspaceId }
  });

  logger.info(`[WORKSPACE SERVICE] Deleted workspace ${id} and all cascading tasks via Prisma.`);
  return res.status(200).json({ success: true, message: 'Workspace and its tasks deleted successfully.', data: null });
});

