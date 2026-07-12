import express from 'express';
import { getEvents, createEvent, deleteEvent } from '../controllers/scheduleEventController.js';
import { verifyToken, requireAdminOrLeader } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/', verifyToken, getEvents);
router.post('/', verifyToken, requireAdminOrLeader, createEvent);
router.delete('/:id', verifyToken, requireAdminOrLeader, deleteEvent);

export default router;
