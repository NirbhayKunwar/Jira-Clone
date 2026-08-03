import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleGoogleLogin, verifyGoogleIdToken } from '../services/googleAuthService.js';
import * as userRepository from '../repositories/userRepository.js';
import * as auditLogRepository from '../repositories/auditLogRepository.js';
import { googleSignIn } from '../controllers/authController.js';
import {
  AccountNotFoundError,
  AccountInactiveError,
  AccountSuspendedError,
  AccountDeletedError,
  InvalidTokenError
} from '../utils/errors.js';

// Mocks
vi.mock('../repositories/userRepository.js');
vi.mock('../repositories/auditLogRepository.js');
vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

const mockGooglePayload = {
  sub: 'google-sub-12345',
  email: 'john@example.com',
  email_verified: true,
  name: 'John Doe',
  picture: 'https://lh3.googleusercontent.com/a/avatar123',
  iss: 'https://accounts.google.com',
  aud: '304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com'
};

describe('Google OAuth Service & Controller Integration Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    auditLogRepository.createAuditLog.mockResolvedValue({});

    req = {
      body: { credential: 'valid-google-id-token' },
      ip: '127.0.0.1',
      headers: { 'user-agent': 'Vitest-Test-Agent' }
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Existing user logs in with Google
  it('should allow existing active user with Google account to log in successfully', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    const existingUser = {
      id: '64f1a2b3c4d5e6f7a8b9c001',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'ACTIVE',
      authProvider: 'GOOGLE',
      googleId: 'google-sub-12345',
      tokenVersion: 1,
      role: 'Full Stack Engineer',
      dept: 'Core Engineering'
    };

    userRepository.findByEmail.mockResolvedValue(existingUser);

    const user = await handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    });

    expect(user).toEqual(existingUser);
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginSuccess',
      actorId: existingUser.id,
      targetUserId: existingUser.id
    }));
  });

  // 2. Non-existing user attempts Google login -> 403 ACCOUNT_NOT_FOUND
  it('should reject non-existing user attempting Google login with 403 ACCOUNT_NOT_FOUND without creating an account', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    userRepository.findByEmail.mockResolvedValue(null);

    await expect(handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    })).rejects.toThrow(AccountNotFoundError);

    expect(userRepository.linkGoogleAccount).not.toHaveBeenCalled();
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginFailed',
      newValue: 'Account not found for email: john@example.com'
    }));

    // Controller Test
    await googleSignIn(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: 'ACCOUNT_NOT_FOUND',
      message: 'No account exists with this email. Please sign up before using Google Sign-In.'
    });
  });

  // 3. Suspended user attempts Google login -> 403 ACCOUNT_SUSPENDED
  it('should reject suspended user attempting Google login', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    const suspendedUser = {
      id: '64f1a2b3c4d5e6f7a8b9c002',
      email: 'john@example.com',
      status: 'SUSPENDED'
    };

    userRepository.findByEmail.mockResolvedValue(suspendedUser);

    await expect(handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    })).rejects.toThrow(AccountSuspendedError);

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginFailed',
      newValue: 'Account is suspended'
    }));

    await googleSignIn(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'ACCOUNT_SUSPENDED'
    }));
  });

  // 4. Deleted user attempts Google login -> 403 ACCOUNT_DELETED
  it('should reject deleted or removed user attempting Google login', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    const deletedUser = {
      id: '64f1a2b3c4d5e6f7a8b9c003',
      email: 'john@example.com',
      status: 'DELETED'
    };

    userRepository.findByEmail.mockResolvedValue(deletedUser);

    await expect(handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    })).rejects.toThrow(AccountDeletedError);

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginFailed',
      newValue: 'Account is deleted'
    }));
  });

  // 5. Inactive user attempts Google login -> 403 ACCOUNT_INACTIVE
  it('should reject inactive/deactivated user attempting Google login', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    const inactiveUser = {
      id: '64f1a2b3c4d5e6f7a8b9c004',
      email: 'john@example.com',
      status: 'INACTIVE'
    };

    userRepository.findByEmail.mockResolvedValue(inactiveUser);

    await expect(handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    })).rejects.toThrow(AccountInactiveError);

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginFailed',
      newValue: 'Account is inactive'
    }));
  });

  // 6. User links Google for the first time
  it('should link Google provider ID and avatar for existing local user signing in with Google first time', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockGooglePayload
    });

    const existingLocalUser = {
      id: '64f1a2b3c4d5e6f7a8b9c005',
      name: 'John Doe',
      email: 'john@example.com',
      status: 'ACTIVE',
      authProvider: 'LOCAL',
      googleId: null,
      avatarUrl: null
    };

    const linkedUser = {
      ...existingLocalUser,
      authProvider: 'GOOGLE',
      googleId: 'google-sub-12345',
      avatarUrl: 'https://lh3.googleusercontent.com/a/avatar123'
    };

    userRepository.findByEmail.mockResolvedValue(existingLocalUser);
    userRepository.linkGoogleAccount.mockResolvedValue(linkedUser);

    const result = await handleGoogleLogin({
      credential: 'valid-google-id-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    });

    expect(userRepository.linkGoogleAccount).toHaveBeenCalledWith('64f1a2b3c4d5e6f7a8b9c005', 'google-sub-12345', 'https://lh3.googleusercontent.com/a/avatar123');
    expect(result).toEqual(linkedUser);
    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleAccountLinked',
      newValue: 'GOOGLE'
    }));
  });

  // 7. Invalid Google ID token
  it('should throw InvalidTokenError if Google token verification fails', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400
    });

    await expect(handleGoogleLogin({
      credential: 'invalid-token',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest'
    })).rejects.toThrow(InvalidTokenError);

    expect(auditLogRepository.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'GoogleLoginFailed'
    }));

    await googleSignIn(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      code: 'INVALID_TOKEN'
    }));
  });

  // 8. Invalid Google token audience (aud mismatch)
  it('should reject Google ID token if audience does not match expected client ID', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockGooglePayload,
        aud: 'malicious-client-id.apps.googleusercontent.com'
      })
    });

    await expect(verifyGoogleIdToken('invalid-aud-token')).rejects.toThrow('Invalid token audience.');
  });

  // 9. Unverified email (email_verified: false)
  it('should reject Google token if email_verified is false', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ...mockGooglePayload,
        email_verified: false
      })
    });

    await expect(verifyGoogleIdToken('unverified-email-token')).rejects.toThrow('Google account email is not verified.');
  });
});
