import express from 'express';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';
import { verifyToken, verifyTeamAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getTeams);
router.post('/', verifyToken, createTeam);
router.put('/:id', verifyToken, verifyTeamAccess, updateTeam);
router.delete('/:id', verifyToken, verifyTeamAccess, deleteTeam);

export default router;
