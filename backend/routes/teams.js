import express from 'express';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';
import { verifyToken, verifyTeamAccess } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/', verifyToken, getTeams);
router.post('/', verifyToken, createTeam);
router.put('/:id', verifyToken, verifyTeamAccess, updateTeam);
router.delete('/:id', verifyToken, verifyTeamAccess, deleteTeam);

export default router;
