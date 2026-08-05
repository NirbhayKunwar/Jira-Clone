import express from 'express';
import { getWorkspaces, createWorkspace, getWorkspaceById, deleteWorkspace } from '../controllers/workspaceController.js';
import { verifyToken, verifyWorkspaceAccess, requireAdminOrLeader } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

// Workspace CRUD Endpoints
router.get('/', verifyToken, getWorkspaces);
router.post('/', verifyToken, createWorkspace);
router.get('/:id', verifyToken, verifyWorkspaceAccess, getWorkspaceById);
router.delete('/:id', verifyToken, verifyWorkspaceAccess, requireAdminOrLeader, deleteWorkspace);

export default router;
