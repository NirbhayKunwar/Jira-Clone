import express from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController.js';
import { verifyToken, verifyGoalAccess, requireAdminOrLeader } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/', verifyToken, getGoals);
router.post('/', verifyToken, requireAdminOrLeader, createGoal);
router.put('/:id', verifyToken, verifyGoalAccess, requireAdminOrLeader, updateGoal);
router.delete('/:id', verifyToken, verifyGoalAccess, requireAdminOrLeader, deleteGoal);

export default router;
