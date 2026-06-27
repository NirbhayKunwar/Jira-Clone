import express from 'express';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getTeams);
router.post('/', verifyToken, createTeam);
router.put('/:id', verifyToken, updateTeam);
router.delete('/:id', verifyToken, deleteTeam);

export default router;
