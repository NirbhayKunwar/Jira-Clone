import express from 'express';
import {
  getNotifications,
  deleteNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(verifyToken);
router.use(apiLimiter);

router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);
router.delete('/:id', deleteNotification);

export default router;
