import express from 'express';
import { signUp, signIn, signOut, refreshTokens, sendOtp, changePassword, updateProfile, getUsers, addTeamMember, deleteUser, googleSignIn, getNotifications, deleteNotification, updateTeamMemberRole } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Authentication Endpoints
router.post('/signup', authLimiter, signUp);
router.post('/signin', authLimiter, signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshTokens);
router.post('/google-signin', authLimiter, googleSignIn);

// Password Reset / Change Endpoints via OTP
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/change-password', authLimiter, changePassword);

// Profile Updates (Secured)
router.put('/profile', verifyToken, updateProfile);

// Registered Users Endpoints (Secured)
router.get('/users', verifyToken, getUsers);
router.post('/users', verifyToken, addTeamMember);
router.delete('/users/:id', verifyToken, deleteUser);
router.put('/users/:id/role', verifyToken, updateTeamMemberRole);

// Notifications (Secured)
router.get('/notifications', verifyToken, getNotifications);
router.delete('/notifications/:id', verifyToken, deleteNotification);

export default router;

