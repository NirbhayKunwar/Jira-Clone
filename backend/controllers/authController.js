import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import prisma from '../config/prisma.js';

// In-memory store for OTPs: { email: { code, expiresAt } }
const otps = {};

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
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (name, email, password) are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (userCheck) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword
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
    
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const isMockMode = !emailUser || !emailPass || emailUser === 'your-email@gmail.com' || emailPass === 'your-16-character-app-password';

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

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

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
    const users = await prisma.user.findMany({
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

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists in the system.' });
    }

    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('temporary_default_password_123!', salt);

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
        websiteUrl: websiteUrl || ''
      }
    });

    return res.status(201).json({
      success: true,
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
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format. Must be an integer.' });
    }

    if (req.user && userId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Self-deletion is not permitted. You cannot delete your own active account.' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

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
    
    const expectedClientId = "304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com";
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
    return res.status(500).json({ success: false, message: 'Internal Server Error during Google Sign-In.' });
  }
};
