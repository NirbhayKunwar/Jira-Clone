import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
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


export const signUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate request inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields (name, email, password) are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (userCheck) {
      return res.status(400).json({ message: 'A user with this email address already exists.' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create and save new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Return success response with user object (omitting password)
    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: {
        id: newUser.id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        dept: newUser.dept,
        location: newUser.location,
        hasConfiguredWorkspace: newUser.hasConfiguredWorkspace
      }
    });

  } catch (error) {
    console.error('Sign Up Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during registration.' });
  }
};

export const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    // Return success response
    return res.status(200).json({
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        dept: user.dept,
        location: user.location,
        hasConfiguredWorkspace: user.hasConfiguredWorkspace
      }
    });

  } catch (error) {
    console.error('Sign In Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during authentication.' });
  }
};

export const signOut = async (req, res) => {
  try {
    // JWT is stateless on the server side
    return res.status(200).json({
      message: 'Signed out successfully. Please clear the local storage token.'
    });
  } catch (error) {
    console.error('Sign Out Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during sign out.' });
  }
};

// Send OTP via Nodemailer and store in memory
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const normalizedEmail = email.toLowerCase();
    
    // Check if email configurations are set
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const isMockMode = !emailUser || !emailPass || emailUser === 'your-email@gmail.com' || emailPass === 'your-16-character-app-password';

    // Generate a 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to in-memory store (expires in 5 minutes)
    otps[normalizedEmail] = {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    };

    // Check if user exists in database
    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!userCheck) {
      return res.status(404).json({ message: 'No account registered with this email address.' });
    }

    if (isMockMode) {
      console.log(`\n==================================================`);
      console.log(`[OTP SERVICE] (MOCK MODE - SMTP NOT CONFIGURED)`);
      console.log(`RESET PASSWORD OTP FOR ${normalizedEmail}: ${code}`);
      console.log(`==================================================\n`);
      return res.status(200).json({ 
        message: 'OTP generated in mock mode. Please check backend server console.'
      });
    }

    // Set up real email sending via Nodemailer
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

    return res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while sending OTP.' });
  }
};

// Change Password using verified OTP code
export const changePassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const otpData = otps[normalizedEmail];

    if (!otpData) {
      return res.status(400).json({ message: 'No OTP requested for this email. Please request a new code.' });
    }

    if (Date.now() > otpData.expiresAt) {
      delete otps[normalizedEmail];
      return res.status(400).json({ message: 'OTP has expired. Please request a new code.' });
    }

    if (otpData.code !== otp) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New Password must be at least 6 characters long.' });
    }

    // Find user in database
    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!userCheck) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password in database
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword }
    });

    // Clear OTP
    delete otps[normalizedEmail];

    console.log(`[OTP SERVICE] Password successfully changed for ${normalizedEmail}`);

    return res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while changing password.' });
  }
};

// Update user workspace profile details
export const updateProfile = async (req, res) => {
  try {
    const { name, role, dept, location, hasConfiguredWorkspace } = req.body;

    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: 'Unauthorized. Invalid session.' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name cannot be empty.' });
    }

    const normalizedEmail = req.user.email.toLowerCase();

    // Prepare update data
    const updateData = {
      name,
      role,
      dept,
      location
    };
    if (hasConfiguredWorkspace !== undefined) {
      updateData.hasConfiguredWorkspace = hasConfiguredWorkspace;
    }

    // Update profile in database
    const updatedUser = await prisma.user.update({
      where: { email: normalizedEmail },
      data: updateData
    });

    console.log(`[USER SERVICE] Profile updated successfully for ${normalizedEmail}`);

    return res.status(200).json({
      message: 'Profile details updated successfully.',
      user: {
        id: updatedUser.id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        dept: updatedUser.dept,
        location: updatedUser.location,
        hasConfiguredWorkspace: updatedUser.hasConfiguredWorkspace
      }
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    if (error.code === 'P2025') { // Prisma record not found error code
      return res.status(404).json({ message: 'User profile not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while updating profile.' });
  }
};

// Get all users in the database
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
      location: u.location || 'San Francisco, CA'
    }));

    return res.status(200).json(mappedUsers);
  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while fetching users.' });
  }
};

// Add a new team member
export const addTeamMember = async (req, res) => {
  try {
    const { name, email, role, dept, location } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and Email are required.' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const userCheck = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (userCheck) {
      return res.status(400).json({ message: 'A team member with this email address already exists.' });
    }

    // Generate a default hashed password for this new user
    const salt = await bcrypt.genSalt(10);
    const defaultHashedPassword = await bcrypt.hash('temporary_default_password_123!', salt);

    // Insert user into DB
    const newMember = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: defaultHashedPassword,
        role: role || 'Full Stack Engineer',
        dept: dept || 'Core Engineering',
        location: location || 'San Francisco, CA'
      }
    });

    return res.status(201).json({
      id: newMember.id.toString(),
      name: newMember.name,
      email: newMember.email,
      role: newMember.role,
      dept: newMember.dept,
      location: newMember.location
    });
  } catch (error) {
    console.error('Add Team Member Error:', error);
    return res.status(500).json({ message: 'Internal Server Error while adding team member.' });
  }
};

// Remove/delete a team member
export const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format. Must be an integer.' });
    }

    if (req.user && userId === req.user.id) {
      return res.status(400).json({ message: 'Self-deletion is not permitted. You cannot delete your own active account.' });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return res.status(200).json({ message: 'Team member removed successfully.' });
  } catch (error) {
    console.error('Delete Team Member Error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'User not found.' });
    }
    return res.status(500).json({ message: 'Internal Server Error while removing team member.' });
  }
};

// Google SSO Sign-in / Auto-registration
export const googleSignIn = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential token is required.' });
    }

    // Call Google TokenInfo endpoint to verify the ID token cryptographically
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return res.status(401).json({ message: 'Google SSO token verification failed.' });
    }

    const payload = await verifyRes.json();
    
    // Validate target audience (client ID)
    const expectedClientId = "304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com";
    if (payload.aud !== expectedClientId) {
      return res.status(401).json({ message: 'Invalid token audience.' });
    }

    const email = payload.email;
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture;

    if (!email) {
      return res.status(400).json({ message: 'Could not extract email from Google token.' });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if user exists in database
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    
    if (!user) {
      // Auto-register Google user in database
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

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Logged in successfully with Google.',
      token,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role || 'Full Stack Engineer',
        dept: user.dept || 'Core Engineering',
        location: user.location || 'San Francisco, CA',
        picture: picture,
        hasConfiguredWorkspace: user.hasConfiguredWorkspace
      }
    });

  } catch (error) {
    console.error('Google Sign In Error:', error);
    return res.status(500).json({ message: 'Internal Server Error during Google Sign-In.' });
  }
};
