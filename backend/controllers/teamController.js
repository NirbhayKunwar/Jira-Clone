import prisma from '../config/prisma.js';

// Get all teams
export const getTeams = async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { id: 'desc' }
    });

    const mapped = teams.map(t => {
      let resolvedMembers = [];
      try {
        resolvedMembers = JSON.parse(t.membersText || '[]');
      } catch (e) {
        resolvedMembers = [];
      }
      return {
        id: t.id.toString(),
        name: t.name,
        desc: t.descText || '',
        members: resolvedMembers
      };
    });

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Get Teams Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching teams.' });
  }
};

// Create a team
export const createTeam = async (req, res) => {
  try {
    const { name, desc, members } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required.' });
    }

    const t = await prisma.team.create({
      data: {
        name: name.trim(),
        descText: desc || '',
        membersText: JSON.stringify(members || [])
      }
    });

    let resolvedMembers = [];
    try {
      resolvedMembers = JSON.parse(t.membersText);
    } catch (e) {
      resolvedMembers = [];
    }

    const mapped = {
      id: t.id.toString(),
      name: t.name,
      desc: t.descText || '',
      members: resolvedMembers
    };

    return res.status(201).json(mapped);
  } catch (error) {
    console.error('Create Team Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while creating team.' });
  }
};

// Update a team
export const updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, desc, members } = req.body;

    const teamId = parseInt(id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format. Must be an integer.' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (desc !== undefined) updateData.descText = desc;
    if (members !== undefined) updateData.membersText = JSON.stringify(members);

    const t = await prisma.team.update({
      where: { id: teamId },
      data: updateData
    });

    let resolvedMembers = [];
    try {
      resolvedMembers = JSON.parse(t.membersText);
    } catch (e) {
      resolvedMembers = [];
    }

    const mapped = {
      id: t.id.toString(),
      name: t.name,
      desc: t.descText || '',
      members: resolvedMembers
    };

    return res.status(200).json(mapped);
  } catch (error) {
    console.error('Update Team Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Team not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while updating team.' });
  }
};

// Delete a team
export const deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const teamId = parseInt(id);
    if (isNaN(teamId)) {
      return res.status(400).json({ message: 'Invalid team ID format. Must be an integer.' });
    }

    await prisma.team.delete({
      where: { id: teamId }
    });

    return res.status(200).json({ message: 'Team deleted successfully.' });
  } catch (error) {
    console.error('Delete Team Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Team not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while deleting team.' });
  }
};
