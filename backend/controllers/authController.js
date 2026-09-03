import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import logger from '../config/logger.js';
import { handleGoogleLogin } from '../services/googleAuthService.js';
import { AppError } from '../utils/errors.js';

// Request Validation Schemas
const signUpSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  invitedBy: z.string().optional()
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
});

const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address')
});

const changePasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string(),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long')
});

const googleSignInSchema = z.object({
  credential: z.string(),
  autoRegister: z.boolean().optional()
});

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty'),
  role: z.string().optional(),
  dept: z.string().optional(),
  location: z.string().optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  websiteUrl: z.string().optional(),
  otherLinks: z.string().optional(),
  hasConfiguredWorkspace: z.boolean().optional()
});

export const addNotification = async (text, type = 'info', userId = null, title = null, workspaceId = null, createdBy = null) => {
  try {
    const derivedTitle = title || (
      type === 'task' ? 'Task Update' :
      type === 'member' ? 'Member Activity' :
      type === 'team' ? 'Team Workspace Update' :
      type === 'goal' ? 'Epic/Goal Update' :
      type === 'calendar' ? 'Schedule Update' : 'System Notification'
    );

    const notif = await prisma.notification.create({
      data: {
        title: derivedTitle,
        message: text,
        type,
        userId,
        workspaceId,
        createdBy
      }
    });
    logger.info(`[NOTIFICATION] Notification created: ${text} for user ${userId} in workspace ${workspaceId}`);
    return notif;
  } catch (error) {
    logger.error('[NOTIFICATION ERROR] Failed to create notification:', error);
    return null;
  }
};

export const claimPendingInvitationsForUser = async (userId, userEmail) => {
  if (!userId || !userEmail || !prisma.invitation) return;
  try {
    const normalizedEmail = userEmail.toLowerCase().trim();
    const pendingInvites = await prisma.invitation.findMany({
      where: {
        email: normalizedEmail,
        status: 'PENDING'
      }
    });

    for (const inv of pendingInvites) {
      if (inv.expiresAt && new Date(inv.expiresAt) < new Date()) continue;

      let wsMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: inv.workspaceId,
          userId: userId
        }
      });

      if (!wsMember) {
        wsMember = await prisma.workspaceMember.create({
          data: {
            workspaceId: inv.workspaceId,
            userId: userId,
            role: inv.workspaceRole || 'MEMBER',
            status: 'ACTIVE'
          }
        });
      } else if (wsMember.status !== 'ACTIVE') {
        wsMember = await prisma.workspaceMember.update({
          where: { id: wsMember.id },
          data: { status: 'ACTIVE', role: inv.workspaceRole || 'MEMBER' }
        });
      }

      if (inv.teamId && wsMember) {
        await prisma.teamMember.create({
          data: {
            teamId: inv.teamId,
            workspaceMemberId: wsMember.id,
            role: inv.teamRole || 'FULLSTACK_ENGINEER'
          }
        }).catch(() => {});
      }

      if (inv.projectId && wsMember) {
        await prisma.projectMember.create({
          data: {
            projectId: inv.projectId,
            workspaceMemberId: wsMember.id,
            role: inv.projectRole || 'DEVELOPER'
          }
        }).catch(() => {});
      }

      await prisma.invitation.update({
        where: { id: inv.id },
        data: { status: 'ACCEPTED' }
      }).catch(() => {});

      logger.info(`[INVITATION CLAIM] Automatically claimed invitation for ${userEmail} in workspace ${inv.workspaceId}`);
    }
  } catch (err) {
    logger.error(`[INVITATION CLAIM ERROR] Error claiming invitations for ${userEmail}:`, err);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const workspaceId = req.query.workspaceId || req.headers['x-workspace-id'];

    const whereConditions = {
      deleted: false,
      userId
    };

    if (workspaceId && /^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      whereConditions.OR = [
        { workspaceId: workspaceId },
        { workspaceId: null }
      ];
    }

    const notifications = await prisma.notification.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });

    const mapped = notifications.map(n => ({
      id: n.id.toString(),
      title: n.title || (
        n.type === 'task' ? 'Task Update' :
        n.type === 'member' ? 'Member Activity' :
        n.type === 'team' ? 'Team Workspace Update' :
        n.type === 'goal' ? 'Epic/Goal Update' :
        n.type === 'calendar' ? 'Schedule Update' : 'System Notification'
      ),
      message: n.message,
      text: n.message, // Return text mapped to message to prevent blank rendering in frontend interfaces
      type: n.type,
      read: n.read,
      deleted: n.deleted,
      deletedAt: n.deletedAt,
      createdAt: n.createdAt,
      userId: n.userId ? n.userId.toString() : null,
      workspaceId: n.workspaceId ? n.workspaceId.toString() : null
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error) {
    logger.error('Failed to fetch notifications:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.', data: null });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID format.', data: null });
    }

    const updated = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { read: true }
    });

    return res.status(200).json({ success: true, message: 'Notification marked as read.', data: updated });
  } catch (error) {
    logger.error('Failed to mark notification as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.', data: null });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true }
    });

    return res.status(200).json({ success: true, message: 'All notifications marked as read.', data: updated });
  } catch (error) {
    logger.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.', data: null });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID format.', data: null });
    }

    const notif = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.', data: null });
    }

    if (notif.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden. Access to this notification is denied.', data: null });
    }

    await prisma.notification.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: new Date()
      }
    });

    return res.status(200).json({ success: true, message: 'Notification deleted successfully.', data: null });
  } catch (error) {
    logger.error('Failed to delete notification:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification.', data: null });
  }
};

const getJwtSecret = () => {
  return process.env.JWT_SECRET || 'Jira_Clone_my_Project_2026';
};

const getJwtRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET || getJwtSecret();
};

const getEmailConfig = () => {
  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;
  const isMockMode = !emailUser || !emailPass || emailUser === 'your-email@gmail.com' || emailPass === 'your-16-character-app-password';

  return { emailUser, emailPass, isMockMode };
};

const createGmailTransporter = (emailUser, emailPass) => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser ? emailUser.trim() : '',
    pass: emailPass ? emailPass.replace(/\s+/g, '').trim() : ''
  }
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const sendTeamInviteEmail = async ({ to, name, invitedByName, temporaryPassword, isSignup = false }) => {
  const { emailUser, emailPass, isMockMode } = getEmailConfig();
  const appUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
  
  const inviteUrl = isSignup 
    ? `${appUrl}/signup?email=${encodeURIComponent(to)}&invitedBy=${encodeURIComponent(invitedByName)}`
    : `${appUrl}/?invite=profile&email=${encodeURIComponent(to)}`;

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(to);
  const safeInvitedByName = escapeHtml(invitedByName || 'Your team admin');
  const safeTemporaryPassword = escapeHtml(temporaryPassword);
  const safeInviteUrl = escapeHtml(inviteUrl);

  const inviteData = {
    sent: !isMockMode,
    mock: isMockMode,
    inviteUrl,
    temporaryPassword,
    isSignup
  };

  if (isMockMode) {
    logger.info(`\n==================================================\n[INVITE SERVICE] (MOCK MODE - SMTP NOT CONFIGURED)\nTEAM INVITE FOR ${to}\nInvited by: ${invitedByName || 'Your team admin'}\nProfile/Signup URL: ${inviteUrl}\n${temporaryPassword ? `Temporary password: ${temporaryPassword}` : ''}\n==================================================\n`);
    return inviteData;
  }

  const transporter = createGmailTransporter(emailUser, emailPass);
  const mailOptions = {
    from: `"Jira Clone Team" <${emailUser}>`,
    to,
    subject: 'You have been invited to Jira Clone',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0052cc; padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Jira Clone</h1>
          <p style="margin: 8px 0 0; opacity: 0.85; font-size: 14px;">Collaboration & Project Tracking</p>
        </div>
        <div style="padding: 32px 24px; color: #172b4d; line-height: 1.6;">
          <h2 style="margin-top: 0; color: #172b4d; font-size: 20px; font-weight: 700;">Hello ${safeName},</h2>
          <p style="font-size: 15px; margin-bottom: 24px;"><strong>${safeInvitedByName}</strong> has added you to their team workspace. You can now log in and start collaborating on tasks, tracking sprints, and planning roadmaps.</p>
          
          ${isSignup ? `
          <div style="background-color: #f4f5f7; border: 1px solid #dfe1e6; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
            <p style="margin: 0; font-size: 14px;">To join the team, please register a new account under your email (<strong>${safeEmail}</strong>) using the signup button below.</p>
          </div>
          ` : temporaryPassword ? `
          <div style="background-color: #f4f5f7; border: 1px solid #dfe1e6; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
            <h3 style="margin-top: 0; font-size: 13px; color: #5e6c84; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Your Credentials</h3>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Email:</strong> <span style="font-family: monospace; color: #0052cc;">${safeEmail}</span></p>
            <p style="margin: 6px 0; font-size: 14px;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background-color: #ebecf0; padding: 3px 6px; border-radius: 4px; font-weight: bold; color: #de350b;">${safeTemporaryPassword}</span></p>
          </div>
          ` : `
          <div style="background-color: #f4f5f7; border: 1px solid #dfe1e6; border-radius: 8px; padding: 20px; margin-bottom: 28px;">
            <p style="margin: 0; font-size: 14px;">Since you already have a Jira Clone account, you can log in directly using your existing email address (<strong>${safeEmail}</strong>) and password.</p>
          </div>
          `}

          <div style="text-align: center; margin: 32px 0;">
            <a href="${safeInviteUrl}" style="background-color: #0052cc; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 82, 204, 0.2); transition: background-color 0.2s;">
              ${isSignup ? 'Create Your Account' : 'Open Workspace'}
            </a>
          </div>

          ${temporaryPassword ? `
          <p style="color: #de350b; font-size: 12px; margin-top: 24px; padding: 10px; background-color: #ffebe6; border-left: 3px solid #ff5630; border-radius: 4px;">
            <strong>Important Security Notice:</strong> This is a temporary password. You will be redirected to your profile settings to configure a secure password immediately after signing in.
          </p>
          ` : ''}
        </div>
        <div style="background-color: #f4f5f7; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 11px; color: #7a869a; margin: 0 0 8px;">This invitation was generated automatically. Please do not reply directly to this message.</p>
          <p style="font-size: 11px; color: #7a869a; margin: 0;">&copy; 2026 Jira Clone. All rights reserved.</p>
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  logger.info(`[INVITE SERVICE] Invite successfully sent via email to: ${to}`);
  return inviteData;
};

const sendTokens = (res, user, statusCode, message) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, teamOwnerId: user.teamOwnerId, tokenVersion: user.tokenVersion },
    getJwtSecret(),
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, teamOwnerId: user.teamOwnerId, tokenVersion: user.tokenVersion },
    getJwtRefreshSecret(),
    { expiresIn: '7d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('jira_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('jira_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.status(statusCode).json({
    success: true,
    message,
    token: accessToken,
    user: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      username: `@${user.email.split('@')[0]}`,
      role: user.role || 'Full Stack Engineer',
      dept: user.dept || 'Core Engineering',
      location: user.location || '',
      githubUrl: user.githubUrl || '',
      linkedinUrl: user.linkedinUrl || '',
      websiteUrl: user.websiteUrl || '',
      otherLinks: user.otherLinks || '',
      hasConfiguredWorkspace: user.hasConfiguredWorkspace
    }
  });
};

export const signUp = async (req, res) => {
  try {
    const body = signUpSchema.parse(req.body);
    const { name, email, password, invitedBy } = body;
    const normalizedEmail = email.toLowerCase();

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (userCheck) {
      if (userCheck.otherLinks === 'PENDING_INVITE') {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const updatedUser = await prisma.user.update({
          where: { id: userCheck.id },
          data: {
            name: name,
            password: hashedPassword,
            otherLinks: '',
            authProvider: 'LOCAL'
          }
        });
        
        await addNotification(`Team member ${updatedUser.name} registered and activated their profile.`, 'member', updatedUser.id);
        return sendTokens(res, updatedUser, 201, 'User registered successfully.');
      }
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.', data: null });
    }

    let teamOwnerId = null;
    if (invitedBy) {
      if (/^[0-9a-fA-F]{24}$/.test(invitedBy)) {
        teamOwnerId = invitedBy;
      } else {
        const inviter = await prisma.user.findUnique({
          where: { email: invitedBy.toLowerCase() }
        });
        if (inviter) {
          teamOwnerId = inviter.id;
        }
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        teamOwnerId,
        authProvider: 'LOCAL',
        rbacRole: teamOwnerId ? 'MEMBER' : 'ADMIN'
      }
    });

    await claimPendingInvitationsForUser(newUser.id, newUser.email);
    await addNotification(`User ${newUser.name} registered successfully.`, 'member', newUser.id);
    return sendTokens(res, newUser, 201, 'User registered successfully.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues?.[0]?.message || 'Validation error', data: null });
    }
    logger.error('Sign Up Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during registration.', data: null });
  }
};

export const signIn = async (req, res) => {
  try {
    const body = signInSchema.parse(req.body);
    const { email, password } = body;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.', data: null });
    }

    if (user.authProvider !== 'LOCAL' || !user.password) {
      return res.status(403).json({ success: false, message: 'This account uses Google SSO. Please sign in via Google.', data: null });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.', data: null });
    }

    if (req.rateLimit && typeof req.rateLimit.resetKey === 'function') {
      req.rateLimit.resetKey();
    }

    try {
      await claimPendingInvitationsForUser(user.id, user.email);
    } catch (invErr) {
      logger.error('[SIGNIN INVITATION CLAIM WARNING]', invErr);
    }
    return sendTokens(res, user, 200, 'Logged in successfully.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues?.[0]?.message || 'Validation error', data: null });
    }
    logger.error('Sign In Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during authentication.', data: null });
  }
};

export const signOut = async (req, res) => {
  try {
    res.clearCookie('jira_token');
    res.clearCookie('jira_refresh_token');
    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.',
      data: null
    });
  } catch (error) {
    logger.error('Sign Out Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during sign out.', data: null });
  }
};

export const refreshTokens = async (req, res) => {
  const refreshToken = req.cookies?.jira_refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token not provided.', data: null });
  }

  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User does not exist.', data: null });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.', data: null });
    }

    // Refresh Token Rotation (RTR): Increment tokenVersion on every rotation
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        tokenVersion: { increment: 1 }
      }
    });

    const newAccessToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, teamOwnerId: updatedUser.teamOwnerId, tokenVersion: updatedUser.tokenVersion },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, teamOwnerId: updatedUser.teamOwnerId, tokenVersion: updatedUser.tokenVersion },
      getJwtRefreshSecret(),
      { expiresIn: '7d' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('jira_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('jira_refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      token: newAccessToken,
      data: {
        token: newAccessToken
      }
    });
  } catch (error) {
    logger.warn('[RTR] Refresh token rotated or invalidated.');
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.', data: null });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const body = sendOtpSchema.parse(req.body);
    const { email } = body;
    const normalizedEmail = email.toLowerCase();
    
    // Automatically remove expired records
    await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    await prisma.otpCode.upsert({
      where: { email: normalizedEmail },
      update: {
        code: hashedCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      },
      create: {
        email: normalizedEmail,
        code: hashedCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!userCheck) {
      return res.status(404).json({ success: false, message: 'No account registered with this email address.', data: null });
    }

    const { emailUser, emailPass, isMockMode } = getEmailConfig();

    if (isMockMode) {
      logger.info(`\n==================================================\n[OTP SERVICE] (MOCK MODE - SMTP NOT CONFIGURED)\nRESET PASSWORD OTP FOR ${normalizedEmail}: ${code}\n==================================================\n`);
      return res.status(200).json({ 
        success: true,
        message: 'OTP generated in mock mode. Please check backend server console.',
        data: null
      });
    }

    const transporter = createGmailTransporter(emailUser, emailPass);
    const mailOptions = {
      from: emailUser,
      to: normalizedEmail,
      subject: 'Jira Clone - Password Reset OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #0052cc; text-align: center;">Jira Clone Security Verification</h2>
          <hr style="border: 0; border-top: 1px solid #eeeeee;" />
          <p>We received a request to reset your password for your Jira Clone account.</p>
          <p>Please use the following 6-digit verification code (OTP) to proceed with the password change:</p>
          <div style="background-color: #f4f5f7; border: 1px dashed #0052cc; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #172b4d; margin: 20px 0; border-radius: 4px;">
            ${code}
          </div>
          <p style="color: #ff5630; font-size: 12px;"><strong>Note:</strong> This OTP is valid for 5 minutes. Do not share this code with anyone.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;" />
          <p style="font-size: 10px; color: #7a869a; text-align: center;">This is an automated security message. Please do not reply directly to this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    logger.info(`[OTP SERVICE] OTP successfully sent via email to: ${normalizedEmail}`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully.', data: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues?.[0]?.message || 'Validation error', data: null });
    }
    logger.error('Send OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while sending OTP.', data: null });
  }
};

export const changePassword = async (req, res) => {
  try {
    const body = changePasswordSchema.parse(req.body);
    const { email, otp, newPassword } = body;
    const normalizedEmail = email.toLowerCase();

    // Clean up expired OTPs first
    await prisma.otpCode.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    const otpData = await prisma.otpCode.findUnique({
      where: { email: normalizedEmail }
    });

    if (!otpData) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email. Please request a new code.', data: null });
    }

    const inputHashed = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpData.code !== inputHashed) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.', data: null });
    }

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!userCheck) {
      return res.status(404).json({ success: false, message: 'User profile not found.', data: null });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Prisma Transaction wrapping database updates
    await prisma.$transaction([
      prisma.user.update({
        where: { email: normalizedEmail },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 }
        }
      }),
      prisma.otpCode.delete({
        where: { email: normalizedEmail }
      })
    ]);

    logger.info(`[OTP SERVICE] Password successfully changed and tokens invalidated for ${normalizedEmail}`);
    return res.status(200).json({ success: true, message: 'Password updated successfully.', data: null });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: error.issues?.[0]?.message || 'Validation error', data: null });
    }
    logger.error('Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while changing password.', data: null });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, role, dept, location, hasConfiguredWorkspace, githubUrl, linkedinUrl, websiteUrl, otherLinks } = req.body;

    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid session.', data: null });
    }

    // Keep name empty check explicitly for tests
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.', data: null });
    }

    const normalizedEmail = req.user.email.toLowerCase();

    const updateData = {
      name,
      role,
      dept,
      location,
      githubUrl,
      linkedinUrl,
      websiteUrl,
      otherLinks
    };
    if (hasConfiguredWorkspace !== undefined) {
      updateData.hasConfiguredWorkspace = hasConfiguredWorkspace;
    }

    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: updateData
    });

    logger.info(`[USER SERVICE] Profile updated successfully for ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Profile details updated successfully.',
      data: {
        user: {
          id: updatedUser.id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          username: `@${updatedUser.email.split('@')[0]}`,
          role: updatedUser.role,
          dept: updatedUser.dept,
          location: updatedUser.location,
          githubUrl: updatedUser.githubUrl || '',
          linkedinUrl: updatedUser.linkedinUrl || '',
          websiteUrl: updatedUser.websiteUrl || '',
          otherLinks: updatedUser.otherLinks || '',
          hasConfiguredWorkspace: updatedUser.hasConfiguredWorkspace
        }
      }
    });
  } catch (error) {
    logger.error('Update Profile Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User profile not found.', data: null });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error while updating profile.', data: null });
  }
};

export const getUsers = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.', data: null });
    }

    let teamOwnerId = req.user ? req.user.teamOwnerId : null;
    if (teamOwnerId === undefined) {
      teamOwnerId = null;
    }

    if (teamOwnerId === null && prisma.user && typeof prisma.user.findUnique === 'function') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { teamOwnerId: true }
      });
      if (user) {
        teamOwnerId = user.teamOwnerId;
      }
    }

    const targetOwnerId = teamOwnerId || userId;

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: targetOwnerId },
          { teamOwnerId: targetOwnerId }
        ]
      },
      orderBy: { id: 'asc' }
    });
    
    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      username: `@${u.email.split('@')[0]}`,
      role: u.role || 'Full Stack Engineer',
      dept: u.dept || 'Core Engineering',
      location: u.location || '',
      githubUrl: u.githubUrl || '',
      linkedinUrl: u.linkedinUrl || '',
      websiteUrl: u.websiteUrl || '',
      otherLinks: u.otherLinks || '',
      isOwner: u.teamOwnerId === null
    }));

    return res.status(200).json(mappedUsers);
  } catch (error) {
    logger.error('Get Users Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while fetching users.', data: null });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { name, email, role, dept, location, githubUrl, linkedinUrl, websiteUrl } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.', data: null });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.', data: null });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      const updatedMember = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          teamOwnerId: userId,
          role: role || existingUser.role || 'Full Stack Engineer',
          dept: dept || existingUser.dept || 'Core Engineering',
          location: location || existingUser.location || ''
        }
      });

      let inviteResult;
      try {
        inviteResult = await sendTeamInviteEmail({
          to: updatedMember.email,
          name: updatedMember.name,
          invitedByName: req.user.email,
          temporaryPassword: null
        });
      } catch (inviteError) {
        logger.error('Team Invite Email Error for Existing User:', inviteError);
        return res.status(500).json({ success: false, message: 'Team member was not added because the invite email could not be sent.', data: null });
      }

      await addNotification(`Team member ${updatedMember.name} was added to the organization.`, 'member', updatedMember.id);

      return res.status(200).json({
        success: true,
        message: inviteResult.mock
          ? 'Existing user added to your team. Invite generated in mock mode; check backend console.'
          : 'Existing user added to your team and notification sent successfully.',
        data: {
          invite: inviteResult,
          user: {
            id: updatedMember.id.toString(),
            name: updatedMember.name,
            email: updatedMember.email,
            role: updatedMember.role,
            dept: updatedMember.dept,
            location: updatedMember.location,
            githubUrl: updatedMember.githubUrl || '',
            linkedinUrl: updatedMember.linkedinUrl || '',
            websiteUrl: updatedMember.websiteUrl || ''
          }
        }
      });
    }

    const temporaryPassword = crypto.randomBytes(6).toString('hex') + '!';
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash(temporaryPassword, salt);

    const newMember = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: defaultHashedPassword,
        role: role || 'Full Stack Engineer',
        dept: dept || 'Core Engineering',
        location: location || '',
        githubUrl: githubUrl || '',
        linkedinUrl: linkedinUrl || '',
        websiteUrl: websiteUrl || '',
        teamOwnerId: userId,
        otherLinks: 'PENDING_INVITE',
        authProvider: 'LOCAL'
      }
    });

    let inviteResult;
    try {
      inviteResult = await sendTeamInviteEmail({
        to: newMember.email,
        name: newMember.name,
        invitedByName: req.user.email,
        temporaryPassword,
        isSignup: true
      });
    } catch (inviteError) {
      if (prisma.user && typeof prisma.user.delete === 'function') {
        await prisma.user.delete({ where: { id: newMember.id } });
      }
      logger.error('Team Invite Email Error:', inviteError);
      return res.status(500).json({ success: false, message: 'Team member was not added because the invite email could not be sent.', data: null });
    }

    await addNotification(`New team member ${newMember.name} was invited to the organization.`, 'member', newMember.id);

    return res.status(201).json({
      success: true,
      message: inviteResult.mock
        ? 'Invitation link generated. Send the link to the user so they can sign up.'
        : 'Team member added and invite sent successfully.',
      data: {
        invite: inviteResult,
        user: {
          id: newMember.id.toString(),
          name: newMember.name,
          email: newMember.email,
          username: `@${newMember.email.split('@')[0]}`,
          role: newMember.role,
          dept: newMember.dept,
          location: newMember.location,
          githubUrl: newMember.githubUrl || '',
          linkedinUrl: newMember.linkedinUrl || '',
          websiteUrl: newMember.websiteUrl || ''
        }
      }
    });
  } catch (error) {
    logger.error('Add Team Member Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while adding team member.', data: null });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.', data: null });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.', data: null });
    }
    const userId = id;

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Self-deletion is not permitted. You cannot delete your own active account.', data: null });
    }

    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamOwnerId: currentUserId
      }
    });

    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Team member not found.', data: null });
    }

    // Wrap tasks unassignment and user deletion inside a Prisma transaction
    await prisma.$transaction([
      prisma.task.updateMany({
        where: { assigneeId: userId },
        data: { assigneeId: null }
      }),
      prisma.user.delete({
        where: { id: userId }
      })
    ]);

    await addNotification(`Team member ${teamMember.name} was removed from the organization.`, 'member', currentUserId);

    return res.status(200).json({ success: true, message: 'Team member removed successfully.', data: null });
  } catch (error) {
    logger.error('Delete Team Member Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error while removing team member.', data: null });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const body = googleSignInSchema.parse(req.body);
    const { credential, autoRegister } = body;

    const user = await handleGoogleLogin({
      credential,
      autoRegister,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    await addNotification(`User ${user.name} logged in using Google SSO.`, 'member', user.id);

    if (req.rateLimit && typeof req.rateLimit.resetKey === 'function') {
      req.rateLimit.resetKey();
    }

    return sendTokens(res, user, 200, 'Logged in successfully with Google.');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.issues?.[0]?.message || 'Validation error',
        data: null
      });
    }

    if (error instanceof AppError || (error.statusCode && error.code)) {
      return res.status(error.statusCode || 400).json({
        success: false,
        code: error.code || 'AUTHENTICATION_ERROR',
        message: error.message
      });
    }

    logger.error('Google Sign In Error:', error);
    const isDatabaseUnavailable =
      error?.name === 'PrismaClientInitializationError' || error?.code === 'P1001';

    return res.status(isDatabaseUnavailable ? 503 : 500).json({
      success: false,
      code: isDatabaseUnavailable ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_SERVER_ERROR',
      message: isDatabaseUnavailable
        ? 'Authentication is temporarily unavailable. Please try again.'
        : 'Internal Server Error during Google Sign-In.',
      data: null
    });
  }
};

export const updateTeamMemberRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const currentUserId = req.user ? req.user.id : null;
    
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.', data: null });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ success: false, message: 'Invalid member ID.', data: null });
    }
    const memberId = id;

    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        teamOwnerId: currentUserId
      }
    });

    if (!member) {
      return res.status(403).json({ success: false, message: 'Forbidden. Access denied.', data: null });
    }

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: { role }
    });

    await addNotification(`Role for team member ${updated.name} updated to "${role}".`, 'member', currentUserId);

    return res.status(200).json({ success: true, message: 'Member role updated successfully.', data: updated });
  } catch (error) {
    logger.error('Update Member Role Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while updating role.', data: null });
  }
};

