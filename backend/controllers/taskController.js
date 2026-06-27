import prisma from '../config/prisma.js';

// Get all tasks
export const getTasks = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    let whereClause = {};
    if (workspaceId) {
      const parsedWorkspaceId = parseInt(workspaceId);
      if (isNaN(parsedWorkspaceId)) {
        return res.status(400).json({ message: 'Invalid workspace ID format. Must be an integer.' });
      }
      whereClause.workspaceId = parsedWorkspaceId;
    }
    
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: { assignee: true },
      orderBy: { id: 'asc' }
    });

    // Map DB columns to match frontend expectations
    const mappedTasks = tasks.map(t => ({
      id: t.id.toString(),
      title: t.title,
      desc: t.descText,
      status: t.status,
      priority: t.priority,
      epic: t.epic,
      assignee: t.assignee ? t.assignee.name : 'You',
      workspaceId: t.workspaceId ? t.workspaceId.toString() : null
    }));

    return res.status(200).json(mappedTasks);
  } catch (error) {
    console.error('Get Tasks Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching tasks.' });
  }
};

// Create a new task
export const createTask = async (req, res) => {
  try {
    const { title, desc, status, priority, epic, assignee, workspaceId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    let parsedWorkspaceId = null;
    if (workspaceId) {
      parsedWorkspaceId = parseInt(workspaceId);
      if (isNaN(parsedWorkspaceId)) {
        return res.status(400).json({ message: 'Invalid workspace ID format. Must be an integer.' });
      }
    }

    // Resolve assignee string name to assigneeId in DB
    let assigneeId = null;
    if (assignee && assignee !== 'You') {
      const user = await prisma.user.findFirst({
        where: { name: assignee }
      });
      if (user) {
        assigneeId = user.id;
      }
    } else if (assignee === 'You' && req.user) {
      assigneeId = req.user.id;
    }

    const t = await prisma.task.create({
      data: {
        title,
        descText: desc || '',
        status: status || 'todo',
        priority: priority || 'Medium',
        epic: epic || 'General Work',
        assigneeId: assigneeId,
        workspaceId: parsedWorkspaceId
      },
      include: { assignee: true }
    });

    const createdTask = {
      id: t.id.toString(),
      title: t.title,
      desc: t.descText,
      status: t.status,
      priority: t.priority,
      epic: t.epic,
      assignee: t.assignee ? t.assignee.name : 'You',
      workspaceId: t.workspaceId ? t.workspaceId.toString() : null
    };

    console.log(`[TASK SERVICE] Created new task in database via Prisma: ${t.title}`);

    return res.status(201).json(createdTask);
  } catch (error) {
    console.error('Create Task Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while creating task.' });
  }
};

// Update a task
export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, desc, status, priority, epic, assignee, workspaceId } = req.body;

    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format. Must be an integer.' });
    }

    // Dynamic field update mapping
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (desc !== undefined) updateData.descText = desc;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (epic !== undefined) updateData.epic = epic;
    if (workspaceId !== undefined) {
      if (workspaceId) {
        const parsedWorkspaceId = parseInt(workspaceId);
        if (isNaN(parsedWorkspaceId)) {
          return res.status(400).json({ message: 'Invalid workspace ID format. Must be an integer.' });
        }
        updateData.workspaceId = parsedWorkspaceId;
      } else {
        updateData.workspaceId = null;
      }
    }

    if (assignee !== undefined) {
      if (assignee && assignee !== 'You') {
        const user = await prisma.user.findFirst({
          where: { name: assignee }
        });
        updateData.assigneeId = user ? user.id : null;
      } else if (assignee === 'You' && req.user) {
        updateData.assigneeId = req.user.id;
      } else {
        updateData.assigneeId = null;
      }
    }

    const t = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: { assignee: true }
    });

    const updatedTask = {
      id: t.id.toString(),
      title: t.title,
      desc: t.descText,
      status: t.status,
      priority: t.priority,
      epic: t.epic,
      assignee: t.assignee ? t.assignee.name : 'You',
      workspaceId: t.workspaceId ? t.workspaceId.toString() : null
    };

    console.log(`[TASK SERVICE] Updated task ${id} in database via Prisma.`);

    return res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Update Task Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Task not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while updating task.' });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const taskId = parseInt(id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID format. Must be an integer.' });
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    console.log(`[TASK SERVICE] Deleted task ${id} from database via Prisma.`);

    return res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    console.error('Delete Task Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Task not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while deleting task.' });
  }
};
