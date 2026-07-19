import express from 'express';
import { getMemberProfile } from '../controllers/memberController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(apiLimiter);

router.get('/:memberId/profile', verifyToken, getMemberProfile);

export default router;
