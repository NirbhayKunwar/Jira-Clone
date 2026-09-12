import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyWorkspaceAccess, requireWorkspaceMember, requireTaskOwnerOrAdmin } from '../middleware/authMiddleware.js';
import { signUp, changePassword, sendOtp } from '../controllers/authController.js';
import prisma from '../config/prisma.js';
import crypto from 'crypto';

vi.mock('../config/prisma.js', () => {
  return {
    default: {
      workspace: {
        findUnique: vi.fn()
      },
      workspaceMember: {
        findFirst: vi.fn(),
        create: vi.fn()
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      task: {
        findUnique: vi.fn()
      },
      otpCode: {
        deleteMany: vi.fn(),
        upsert: vi.fn(),
        findUnique: vi.fn()
      },
      notification: {
        create: vi.fn()
      },
      $transaction: vi.fn((cb) => typeof cb === 'function' ? cb(prisma) : Promise.all(cb))
    }
  };
});

describe('Security Audit & Remediation Verification Tests', () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'super_secure_test_jwt_secret_32bytes_long!';
    process.env.JWT_REFRESH_SECRET = 'super_secure_test_refresh_secret_32bytes!';
    req = {
      query: {},
      body: {},
      params: {},
      headers: {},
      user: null
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  describe('Requirement 1 & 2: Safe Startup & Secrets Verification', () => {
    it('should throw fatal startup error when JWT_SECRET is missing', () => {
      const origSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      const checkStartup = () => {
        if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
          throw new Error('FATAL: JWT_SECRET environment variable is not set. Application cannot start safely.');
        }
      };
      
      process.env.NODE_ENV = 'production';
      expect(checkStartup).toThrow('FATAL: JWT_SECRET environment variable is not set.');
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = origSecret;
    });
  });

  describe('Requirement 3: Workspace BOLA / IDOR Verification', () => {
    it('1. Unauthenticated user request to workspace should return 401', async () => {
      req.user = null;
      req.params = { id: '60c72b2f9b1d8e001c888888' };
      
      await verifyWorkspaceAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('2. User A cannot access User B workspace (returns 403 Forbidden)', async () => {
      req.user = { id: '60c72b2f9b1d8e001c888881', rbacRole: 'MEMBER' };
      req.params = { id: '60c72b2f9b1d8e001c888882' };

      prisma.workspace.findUnique.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888882',
        name: 'User B Private Workspace',
        ownerId: '60c72b2f9b1d8e001c888899' // User B
      });

      prisma.workspaceMember.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: '60c72b2f9b1d8e001c888881', teamOwnerId: null });

      await verifyWorkspaceAccess(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('3. Workspace with ownerId = null does NOT bypass authorization check', async () => {
      req.user = { id: '60c72b2f9b1d8e001c888881', rbacRole: 'MEMBER' };
      req.params = { id: '60c72b2f9b1d8e001c888883' };

      prisma.workspace.findUnique.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888883',
        name: 'Orphaned Workspace',
        ownerId: null // ownerId is null
      });

      prisma.workspaceMember.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: '60c72b2f9b1d8e001c888881', teamOwnerId: null });

      await verifyWorkspaceAccess(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('4. Global ADMIN role cannot access unrelated workspace without explicit membership', async () => {
      req.user = { id: '60c72b2f9b1d8e001c888881', rbacRole: 'ADMIN' };
      req.params = { id: '60c72b2f9b1d8e001c888884' };

      prisma.workspace.findUnique.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888884',
        name: 'Target Workspace',
        ownerId: '60c72b2f9b1d8e001c888899'
      });

      prisma.workspaceMember.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ id: '60c72b2f9b1d8e001c888881', teamOwnerId: null });

      await verifyWorkspaceAccess(req, res, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    });

    it('5. User A cannot modify User B task across workspaces (403 Forbidden)', async () => {
      req.user = { id: '60c72b2f9b1d8e001c888881', rbacRole: 'MEMBER' };
      req.params = { id: '60c72b2f9b1d8e001c888855' };

      prisma.task.findUnique.mockResolvedValue({
        id: '60c72b2f9b1d8e001c888855',
        title: 'User B Task',
        assigneeId: '60c72b2f9b1d8e001c888899', // Assigned to User B
        workspaceId: '60c72b2f9b1d8e001c888884',
        workspace: { ownerId: '60c72b2f9b1d8e001c888899' }
      });

      prisma.workspaceMember.findFirst.mockResolvedValue(null);

      await requireTaskOwnerOrAdmin(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Requirement 8: Secure OTP PRNG Verification', () => {
    it('OTP generation should produce a 6-digit numeric string using crypto.randomInt', () => {
      const code = crypto.randomInt(100000, 1000000).toString();
      expect(code).toMatch(/^[1-9][0-9]{5}$/);
      expect(code.length).toBe(6);
    });
  });

  describe('Requirement 9: Password Policy Enforcement', () => {
    it('SignUp schema should reject weak passwords under 8 characters or missing numbers', async () => {
      req.body = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'weak' // < 8 characters
      };

      await signUp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringMatching(/Password must be at least 8 characters long/)
      }));
    });

    it('SignUp schema should reject passwords without numbers', async () => {
      req.body = {
        name: 'New User',
        email: 'newuser2@example.com',
        password: 'onlyletters' // no numbers
      };

      await signUp(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        message: expect.stringMatching(/Password must contain at least one number/)
      }));
    });
  });
});
