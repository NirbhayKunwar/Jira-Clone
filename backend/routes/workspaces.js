import express from 'express';
import { getWorkspaces, createWorkspace, getWorkspaceById, deleteWorkspace } from '../controllers/workspaceController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Workspace CRUD Endpoints
router.get('/', verifyToken, getWorkspaces);
router.post('/', verifyToken, createWorkspace);
router.get('/:id', verifyToken, getWorkspaceById);
router.delete('/:id', verifyToken, deleteWorkspace);

export default router;
