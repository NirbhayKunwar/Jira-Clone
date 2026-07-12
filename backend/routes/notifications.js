import express from 'express';
import { getNotifications, deleteNotification } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(verifyToken);
router.use(apiLimiter);

router.get('/', getNotifications);
router.delete('/:id', deleteNotification);

export default router;
