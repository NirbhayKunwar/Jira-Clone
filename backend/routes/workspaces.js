import express from 'express';
import { getWorkspaces, createWorkspace, getWorkspaceById, deleteWorkspace } from '../controllers/workspaceController.js';
import { verifyToken, verifyWorkspaceAccess } from '../middleware/authMiddleware.js';

const router = express.Router();

// Workspace CRUD Endpoints
router.get('/', verifyToken, getWorkspaces);
router.post('/', verifyToken, createWorkspace);
router.get('/:id', verifyToken, verifyWorkspaceAccess, getWorkspaceById);
router.delete('/:id', verifyToken, verifyWorkspaceAccess, deleteWorkspace);

export default router;
