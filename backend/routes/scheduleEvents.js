import express from 'express';
import { getEvents, createEvent, deleteEvent } from '../controllers/scheduleEventController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, getEvents);
router.post('/', verifyToken, createEvent);
router.delete('/:id', verifyToken, deleteEvent);

export default router;
