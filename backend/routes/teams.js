import express from 'express';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../controllers/teamController.js';
import { verifyToken, verifyTeamAccess, requireAdminOrLeader } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/', verifyToken, getTeams);
router.post('/', verifyToken, requireAdminOrLeader, createTeam);
router.put('/:id', verifyToken, verifyTeamAccess, requireAdminOrLeader, updateTeam);
router.delete('/:id', verifyToken, verifyTeamAccess, requireAdminOrLeader, deleteTeam);

export default router;
