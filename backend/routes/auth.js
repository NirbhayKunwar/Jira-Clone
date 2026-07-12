import express from 'express';
import { signUp, signIn, signOut, refreshTokens, sendOtp, changePassword, updateProfile, getUsers, addTeamMember, deleteUser, googleSignIn, getNotifications, deleteNotification, updateTeamMemberRole } from '../controllers/authController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter, apiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Authentication Endpoints
router.post('/signup', authLimiter, signUp);
router.post('/signin', authLimiter, signIn);
router.post('/signout', apiLimiter, signOut);
router.post('/refresh', apiLimiter, refreshTokens);
router.post('/google-signin', authLimiter, googleSignIn);

// Password Reset / Change Endpoints via OTP
router.post('/send-otp', otpLimiter, sendOtp);
router.post('/change-password', authLimiter, changePassword);

// Profile Updates (Secured)
router.put('/profile', verifyToken, apiLimiter, updateProfile);

// Registered Users Endpoints (Secured)
router.get('/users', verifyToken, apiLimiter, getUsers);
router.post('/users', verifyToken, apiLimiter, addTeamMember);
router.delete('/users/:id', verifyToken, apiLimiter, deleteUser);
router.put('/users/:id/role', verifyToken, apiLimiter, updateTeamMemberRole);

// Notifications (Secured)
router.get('/notifications', verifyToken, apiLimiter, getNotifications);
router.delete('/notifications/:id', verifyToken, apiLimiter, deleteNotification);

export default router;

