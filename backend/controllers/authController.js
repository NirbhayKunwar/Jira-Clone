import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '../config/prisma.js';

// In-memory store for OTPs: { email: { code, expiresAt } }
const otps = {};

// In-memory notifications store
if (!global.notifications) {
  global.notifications = [
    { id: 'init-1', text: 'Jira Workspace Initialized successfully.', createdAt: new Date().toISOString(), type: 'info' }
  ];
}

export const addNotification = (text, type = 'info') => {
  const newNotification = {
    id: Math.random().toString(36).substring(2, 9),
    text,
    createdAt: new Date().toISOString(),
    type
  };
  global.notifications = [newNotification, ...global.notifications].slice(0, 50);
};

export const getNotifications = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: global.notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

// Periodically clean up expired OTPs every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const email in otps) {
    if (otps[email] && otps[email].expiresAt < now) {
      delete otps[email];
    }
  }
}, 60 * 60 * 1000);

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  return secret;
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
    user: emailUser,
    pass: emailPass
  }
});

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sendTeamInviteEmail = async ({ to, name, invitedByName, temporaryPassword, isSignup = false }) => {
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
    console.log(`\n==================================================`);
    console.log(`[INVITE SERVICE] (MOCK MODE - SMTP NOT CONFIGURED)`);
    console.log(`TEAM INVITE FOR ${to}`);
    console.log(`Invited by: ${invitedByName || 'Your team admin'}`);
    console.log(`Profile/Signup URL: ${inviteUrl}`);
    if (temporaryPassword) console.log(`Temporary password: ${temporaryPassword}`);
    console.log(`==================================================\n`);
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
  console.log(`[INVITE SERVICE] Invite successfully sent via email to: ${to}`);
  return inviteData;
};

// Helper to generate access and refresh tokens, set cookies, and send response
const sendTokens = (res, user, statusCode, message) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    getJwtSecret(),
    { expiresIn: '15m' } // 15 minutes access token
  );

  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    getJwtRefreshSecret(),
    { expiresIn: '7d' } // 7 days refresh token
  );

  const isProduction = process.env.NODE_ENV === 'production';

  // Set access token cookie
  res.cookie('jira_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 mins
  });

  // Set refresh token cookie
  res.cookie('jira_refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.status(statusCode).json({
    success: true,
    message,
    token: accessToken, // Backward compatibility for headers-based clients
    user: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
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
    const { name, email, password, invitedBy } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
    }

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
            otherLinks: ''
          }
        });
        
        return sendTokens(res, updatedUser, 201, 'User registered successfully.');
      }
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    let teamOwnerId = null;
    if (invitedBy) {
      const parsedId = parseInt(invitedBy);
      if (!isNaN(parsedId)) {
        teamOwnerId = parsedId;
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
        teamOwnerId
      }
    });

    return sendTokens(res, newUser, 201, 'User registered successfully.');
  } catch (error) {
    console.error('Sign Up Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during registration.' });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    return sendTokens(res, user, 200, 'Logged in successfully.');
  } catch (error) {
    console.error('Sign In Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during authentication.' });
  }
};

export const signOut = async (req, res) => {
  try {
    res.clearCookie('jira_token');
    res.clearCookie('jira_refresh_token');
    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.'
    });
  } catch (error) {
    console.error('Sign Out Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error during sign out.' });
  }
};

export const refreshTokens = async (req, res) => {
  const refreshToken = req.cookies?.jira_refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token not provided.' });
  }

  try {
    const decoded = jwt.verify(refreshToken, getJwtRefreshSecret());
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User does not exist.' });
    }

    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('jira_token', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 mins
    });

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      token: newAccessToken
    });
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired refresh token.' });
  }
};

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase();
    
    const { emailUser, emailPass, isMockMode } = getEmailConfig();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    
    otps[normalizedEmail] = {
      code: hashedCode,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!userCheck) {
      return res.status(404).json({ success: false, message: 'No account registered with this email address.' });
    }

    if (isMockMode) {
      console.log(`\n==================================================`);
      console.log(`[OTP SERVICE] (MOCK MODE - SMTP NOT CONFIGURED)`);
      console.log(`RESET PASSWORD OTP FOR ${normalizedEmail}: ${code}`);
      console.log(`==================================================\n`);
      return res.status(200).json({ 
        success: true,
        message: 'OTP generated in mock mode. Please check backend server console.'
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
    console.log(`[OTP SERVICE] OTP successfully sent via email to: ${normalizedEmail}`);

    return res.status(200).json({ success: true, message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while sending OTP.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const otpData = otps[normalizedEmail];

    if (!otpData) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email. Please request a new code.' });
    }

    if (Date.now() > otpData.expiresAt) {
      delete otps[normalizedEmail];
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new code.' });
    }

    const inputHashed = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpData.code !== inputHashed) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New Password must be at least 6 characters long.' });
    }

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!userCheck) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword }
    });

    delete otps[normalizedEmail];

    console.log(`[OTP SERVICE] Password successfully changed for ${normalizedEmail}`);

    return res.status(200).json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while changing password.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, role, dept, location, hasConfiguredWorkspace, githubUrl, linkedinUrl, websiteUrl, otherLinks } = req.body;

    if (!req.user || !req.user.email) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Invalid session.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
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

    console.log(`[USER SERVICE] Profile updated successfully for ${normalizedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Profile details updated successfully.',
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        dept: updatedUser.dept,
        location: updatedUser.location,
        githubUrl: updatedUser.githubUrl || '',
        linkedinUrl: updatedUser.linkedinUrl || '',
        websiteUrl: updatedUser.websiteUrl || '',
        otherLinks: updatedUser.otherLinks || '',
        hasConfiguredWorkspace: updatedUser.hasConfiguredWorkspace
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error while updating profile.' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const users = await prisma.user.findMany({
      where: { teamOwnerId: userId },
      orderBy: { id: 'asc' }
    });
    
    const mappedUsers = users.map(u => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'Full Stack Engineer',
      dept: u.dept || 'Core Engineering',
      location: u.location || '',
      githubUrl: u.githubUrl || '',
      linkedinUrl: u.linkedinUrl || '',
      websiteUrl: u.websiteUrl || '',
      otherLinks: u.otherLinks || ''
    }));

    return res.status(200).json(mappedUsers);
  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while fetching users.' });
  }
};

export const addTeamMember = async (req, res) => {
  try {
    const { name, email, role, dept, location, githubUrl, linkedinUrl, websiteUrl } = req.body;
    const userId = req.user ? req.user.id : null;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      // Update existing user to belong to this team
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
          temporaryPassword: null // Null signifies they already have an account/password
        });
      } catch (inviteError) {
        console.error('Team Invite Email Error for Existing User:', inviteError);
        return res.status(500).json({ success: false, message: 'Team member was not added because the invite email could not be sent.' });
      }

      addNotification(`Team member ${updatedMember.name} was added to the organization.`, 'member');

      return res.status(200).json({
        success: true,
        message: inviteResult.mock
          ? 'Existing user added to your team. Invite generated in mock mode; check backend console.'
          : 'Existing user added to your team and notification sent successfully.',
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
      });
    }

    // If user does not exist:
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
        otherLinks: 'PENDING_INVITE'
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
      await prisma.user.delete({ where: { id: newMember.id } });
      console.error('Team Invite Email Error:', inviteError);
      return res.status(500).json({ success: false, message: 'Team member was not added because the invite email could not be sent.' });
    }

    addNotification(`New team member ${newMember.name} was invited to the organization.`, 'member');

    return res.status(201).json({
      success: true,
      message: inviteResult.mock
        ? 'Invitation link generated. Send the link to the user so they can sign up.'
        : 'Team member added and invite sent successfully.',
      invite: inviteResult,
      user: {
        id: newMember.id.toString(),
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        dept: newMember.dept,
        location: newMember.location,
        githubUrl: newMember.githubUrl || '',
        linkedinUrl: newMember.linkedinUrl || '',
        websiteUrl: newMember.websiteUrl || ''
      }
    });
  } catch (error) {
    console.error('Add Team Member Error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error while adding team member.' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user ? req.user.id : null;
    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format. Must be an integer.' });
    }

    if (userId === currentUserId) {
      return res.status(400).json({ success: false, message: 'Self-deletion is not permitted. You cannot delete your own active account.' });
    }

    const teamMember = await prisma.user.findFirst({
      where: {
        id: userId,
        teamOwnerId: currentUserId
      }
    });

    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Team member not found.' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    addNotification(`Team member ${teamMember.name} was removed from the organization.`, 'member');

    return res.status(200).json({ success: true, message: 'Team member removed successfully.' });
  } catch (error) {
    console.error('Delete Team Member Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(500).json({ success: false, message: 'Internal Server Error while removing team member.' });
  }
};

export const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential token is required.' });
    }

    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ success: false, message: 'Google SSO token verification failed.' });
    }

    const payload = await verifyRes.json();
    
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || "304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com";
    if (payload.aud !== expectedClientId) {
      return res.status(401).json({ success: false, message: 'Invalid token audience.' });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Could not extract email from Google token.' });
    }

    const normalizedEmail = email.toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const defaultHashedPassword = await bcrypt.hash('google_sso_default_password_123!', salt);
      const namePlaceholder = name || email.split('@')[0];
      
      user = await prisma.user.create({
        data: {
          name: namePlaceholder,
          email: normalizedEmail,
          password: defaultHashedPassword
        }
      });
      console.log(`[GOOGLE AUTH] Auto-registered Google user: ${normalizedEmail}`);
    }

    return sendTokens(res, user, 200, 'Logged in successfully with Google.');
  } catch (error) {
    console.error('Google Sign In Error:', error);
    const isDatabaseUnavailable =
      error?.name === 'PrismaClientInitializationError' || error?.code === 'P1001';

    return res.status(isDatabaseUnavailable ? 503 : 500).json({
      success: false,
      message: isDatabaseUnavailable
        ? 'Authentication is temporarily unavailable. Please try again.'
        : 'Internal Server Error during Google Sign-In.'
    });
  }
};
