import prisma from '../config/prisma.js';

// Get all workspaces
export const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      orderBy: { id: 'asc' }
    });
    
    // Map DB schema fields to camelCase names for frontend consistency
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

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Get Workspaces Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching workspaces.' });
  }
};

// Get workspace by ID
export const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = parseInt(id);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format. Must be an integer.' });
    }
    const w = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    });

    if (!w) {
      return res.status(404).json({ message: 'Workspace not found.' });
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

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Get Workspace By ID Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching workspace.' });
  }
};

// Create a new workspace
export const createWorkspace = async (req, res) => {
  try {
    const { name, key, template_type, board_name, description, sprint_duration, wip_limit } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Workspace name is required.' });
    }
    const normalizedKey = key.toUpperCase().trim();
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(normalizedKey)) {
      return res.status(400).json({ message: 'Project key must start with a letter and consist of 2 to 10 alphanumeric characters (e.g., PROJ).' });
    }
    if (!template_type) {
      return res.status(400).json({ message: 'Workspace template type (scrum or kanban) is required.' });
    }

    // Create workspace without seeding tasks
    const w = await prisma.workspace.create({
      data: {
        name: name.trim(),
        key: normalizedKey,
        templateType: template_type,
        boardName: board_name || `${name} Board`,
        description: description || '',
        sprintDuration: template_type === 'scrum' ? (sprint_duration || 2) : null,
        wipLimit: template_type === 'kanban' ? (wip_limit || 5) : null
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

    return res.status(201).json(mapped);
  } catch (error) {
    console.error('Create Workspace Error:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation code
      return res.status(400).json({ message: 'A project with this key already exists. Please choose a different key.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while creating workspace.' });
  }
};

// Delete workspace
export const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const workspaceId = parseInt(id);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ message: 'Invalid workspace ID format. Must be an integer.' });
    }
    
    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    console.log(`[WORKSPACE SERVICE] Deleted workspace ${id} and all cascading tasks via Prisma.`);
    return res.status(200).json({ message: 'Workspace and its tasks deleted successfully.' });
  } catch (error) {
    console.error('Delete Workspace Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Workspace not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while deleting workspace.' });
  }
};
