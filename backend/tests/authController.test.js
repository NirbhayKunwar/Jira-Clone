import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addTeamMember, updateProfile } from '../controllers/authController.js';
import prisma from '../config/prisma.js';

const sendMailMock = vi.hoisted(() => vi.fn());

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: sendMailMock
    }))
  }
}));

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      user: {
        create: vi.fn(),
        delete: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn()
      }
    }
  };
});

describe('Auth Controller Profile updates tests', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    sendMailMock.mockResolvedValue({});
    process.env.EMAIL_USER = 'sender@example.com';
    process.env.EMAIL_PASS = 'app-password';
    req = {
      body: { name: 'Audit User' },
      user: { id: 1, email: 'test@example.com' }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('should update profile successfully and return formatted payload', async () => {
    prisma.user.update.mockResolvedValue({
      id: 1,
      name: 'Audit User',
      email: 'test@example.com',
      role: 'QA Engineer',
      dept: 'Core',
      location: 'London',
      githubUrl: '',
      linkedinUrl: '',
      websiteUrl: '',
      otherLinks: '',
      hasConfiguredWorkspace: true
    });

    await updateProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Profile details updated successfully.'
    }));
  });

  it('should return 400 if name is empty', async () => {
    req.body.name = '';

    await updateProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Name cannot be empty.'
    }));
  });

  it('should send an invite email when adding a team member', async () => {
    req.body = {
      name: 'New Member',
      email: 'NEW@example.com',
      role: 'Designer',
      dept: 'Product',
      location: 'Remote'
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 2,
      name: 'New Member',
      email: 'new@example.com',
      role: 'Designer',
      dept: 'Product',
      location: 'Remote',
      githubUrl: '',
      linkedinUrl: '',
      websiteUrl: ''
    });

    await addTeamMember(req, res, next);

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: 'new@example.com',
      subject: 'You have been invited to Jira Clone'
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Team member added and invite sent successfully.'
    }));
  });

  it('should roll back the new member if invite email delivery fails', async () => {
    req.body = {
      name: 'New Member',
      email: 'new@example.com'
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 2,
      name: 'New Member',
      email: 'new@example.com',
      role: 'Full Stack Engineer',
      dept: 'Core Engineering',
      location: ''
    });
    sendMailMock.mockRejectedValue(new Error('SMTP failed'));

    await addTeamMember(req, res, next);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Team member was not added because the invite email could not be sent.'
    }));
  });
});
