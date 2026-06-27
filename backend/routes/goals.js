import express from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal } from '../controllers/goalController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getGoals);
router.post('/', verifyToken, createGoal);
router.put('/:id', verifyToken, updateGoal);
router.delete('/:id', verifyToken, deleteGoal);

export default router;
