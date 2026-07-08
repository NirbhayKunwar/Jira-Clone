import express from 'express';
import { signUp, signIn, signOut, refreshTokens, sendOtp, changePassword, updateProfile, getUsers, addTeamMember, deleteUser, googleSignIn, getNotifications, updateTeamMemberRole } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// 10 requests per 15 minutes for auth/sensitive operations
const strictLimiter = rateLimiter(15 * 60 * 1000, 10);

// Authentication Endpoints
router.post('/signup', strictLimiter, signUp);
router.post('/signin', strictLimiter, signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshTokens);
router.post('/google-signin', strictLimiter, googleSignIn);

// Password Reset / Change Endpoints via OTP
router.post('/send-otp', strictLimiter, sendOtp);
router.post('/change-password', strictLimiter, changePassword);

// Profile Updates (Secured)
router.put('/profile', verifyToken, updateProfile);

// Registered Users Endpoints (Secured)
router.get('/users', verifyToken, getUsers);
router.post('/users', verifyToken, addTeamMember);
router.delete('/users/:id', verifyToken, deleteUser);
router.put('/users/:id/role', verifyToken, updateTeamMemberRole);

// Notifications (Secured)
router.get('/notifications', verifyToken, getNotifications);

export default router;

