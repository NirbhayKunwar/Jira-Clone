import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateProfile } from '../controllers/authController.js';
import prisma from '../config/prisma.js';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      user: {
        update: vi.fn()
      }
    }
  };
});

describe('Auth Controller Profile updates tests', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
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
});
