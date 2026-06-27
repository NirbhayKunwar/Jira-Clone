import prisma from '../config/prisma.js';

// Get all goals
export const getGoals = async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      orderBy: { id: 'desc' }
    });

    // Map to frontend structure
    const mapped = goals.map(g => ({
      id: g.id.toString(),
      title: g.title,
      desc: g.descText || '',
      owner: g.owner,
      targetDate: g.targetDate || '',
      progress: g.progress,
      status: g.status
    }));

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Get Goals Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching goals.' });
  }
};

// Create a goal
export const createGoal = async (req, res) => {
  try {
    const { title, desc, owner, targetDate, progress, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Goal title is required.' });
    }

    const g = await prisma.goal.create({
      data: {
        title: title.trim(),
        descText: desc || '',
        owner: owner || 'You',
        targetDate: targetDate || '',
        progress: progress !== undefined ? parseInt(progress) : 0,
        status: status || 'on_track'
      }
    });

    const mapped = {
      id: g.id.toString(),
      title: g.title,
      desc: g.descText || '',
      owner: g.owner,
      targetDate: g.targetDate || '',
      progress: g.progress,
      status: g.status
    };

    return res.status(201).json(mapped);
  } catch (error) {
    console.error('Create Goal Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while creating goal.' });
  }
};

// Update a goal
export const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, status, title, desc, owner, targetDate } = req.body;

    const goalId = parseInt(id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format. Must be an integer.' });
    }

    const updateData = {};
    if (progress !== undefined) updateData.progress = parseInt(progress);
    if (status !== undefined) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (desc !== undefined) updateData.descText = desc;
    if (owner !== undefined) updateData.owner = owner;
    if (targetDate !== undefined) updateData.targetDate = targetDate;

    const g = await prisma.goal.update({
      where: { id: goalId },
      data: updateData
    });

    const mapped = {
      id: g.id.toString(),
      title: g.title,
      desc: g.descText || '',
      owner: g.owner,
      targetDate: g.targetDate || '',
      progress: g.progress,
      status: g.status
    };

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Update Goal Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Goal not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while updating goal.' });
  }
};

// Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;

    const goalId = parseInt(id);
    if (isNaN(goalId)) {
      return res.status(400).json({ message: 'Invalid goal ID format. Must be an integer.' });
    }

    await prisma.goal.delete({
      where: { id: goalId }
    });

    return res.status(200).json({ message: 'Goal deleted successfully.' });
  } catch (error) {
    console.error('Delete Goal Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Goal not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while deleting goal.' });
  }
};
