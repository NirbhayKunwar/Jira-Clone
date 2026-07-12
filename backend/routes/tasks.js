import express from 'express';
import { getTasks, createTask, updateTask, deleteTask, claimTask } from '../controllers/taskController.js';
import { verifyToken, requireAdminOrLeader, requireTaskOwnerOrAdmin } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

// Task CRUD Endpoints
router.get('/', verifyToken, getTasks);
router.post('/', verifyToken, requireAdminOrLeader, createTask);
router.put('/:id', verifyToken, requireTaskOwnerOrAdmin, updateTask);
router.put('/:id/claim', verifyToken, claimTask);
router.delete('/:id', verifyToken, requireTaskOwnerOrAdmin, deleteTask);

export default router;
