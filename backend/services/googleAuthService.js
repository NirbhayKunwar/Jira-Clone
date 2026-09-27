import * as userRepository from '../repositories/userRepository.js';
import * as auditLogRepository from '../repositories/auditLogRepository.js';
import logger from '../config/logger.js';
import {
  AccountNotFoundError,
  AccountInactiveError,
  AccountSuspendedError,
  AccountDeletedError,
  InvalidTokenError
} from '../utils/errors.js';

export const verifyGoogleIdToken = async (credential) => {
  if (!credential) {
    throw new InvalidTokenError('Google ID token is required.');
  }

  let verifyRes;
  try {
    verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
  } catch (netErr) {
    logger.error('[GOOGLE VERIFICATION ERROR] Network failure connecting to Google OAuth servers:', netErr);
    throw new InvalidTokenError('Unable to connect to Google OAuth servers for verification.');
  }

  if (!verifyRes.ok) {
    let errBody;
    try { errBody = await verifyRes.json(); } catch {}
    const detail = errBody?.error_description || errBody?.error || 'Google SSO token verification failed.';
    throw new InvalidTokenError(`Google SSO token verification failed: ${detail}`);
  }

  let payload;
  try {
    payload = await verifyRes.json();
  } catch (jsonErr) {
    throw new InvalidTokenError('Invalid response payload from Google OAuth server.');
  }

  // Validate issuer (iss)
  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new InvalidTokenError('Invalid token issuer.');
  }

  // Validate audience (aud)
  const expectedClientId = process.env.GOOGLE_CLIENT_ID || '';
  if (expectedClientId && payload.aud !== expectedClientId) {
    throw new InvalidTokenError('Invalid token audience.');
  }

  // Validate email_verified
  const isEmailVerified = payload.email_verified === true || payload.email_verified === 'true';
  if (!isEmailVerified) {
    throw new InvalidTokenError('Google account email is not verified.');
  }

  if (!payload.email || !payload.sub) {
    throw new InvalidTokenError('Could not extract email or provider ID from Google token.');
  }

  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture || null
  };
};

export const handleGoogleLogin = async ({
  credential,
  ipAddress,
  userAgent,
  autoRegister = false
}) => {
  let googleUser;

  try {
    googleUser = await verifyGoogleIdToken(credential);
  } catch (err) {
    // Audit logging must NEVER replace the original authentication error.
    try {
      await auditLogRepository.createAuditLog({
        action: 'GoogleLoginFailed',
        resourceType: 'User',
        newValue: err?.message || 'Invalid Google ID token',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error(
        '[GOOGLE AUTH] Failed to write failed-login audit log:',
        auditError
      );
    }

    throw err;
  }

  const { sub, email, picture, name } = googleUser;

  let user;

  try {
    user = await userRepository.findByEmail(email);
  } catch (error) {
    logger.error('[GOOGLE AUTH] Failed to find user by email:', error);
    throw error;
  }

  // Auto-register user if requested
  if (!user) {
    if (autoRegister) {
      try {
        user = await userRepository.createGoogleUser({
          email,
          name,
          googleId: sub,
          avatarUrl: picture
        });
      } catch (error) {
        logger.error('[GOOGLE AUTH] Failed to create Google user:', error);
        throw error;
      }

      try {
        await auditLogRepository.createAuditLog({
          actorId: user.id,
          targetUserId: user.id,
          action: 'GoogleAccountCreated',
          resourceType: 'User',
          newValue: 'Created new user account via Google OAuth',
          ipAddress,
          userAgent
        });
      } catch (auditError) {
        logger.error(
          '[GOOGLE AUTH] Failed to write account-created audit log:',
          auditError
        );
      }

      logger.info(
        `[GOOGLE AUTH] Auto-created user account for ${email} via Google SSO`
      );

      return user;
    }

    try {
      await auditLogRepository.createAuditLog({
        action: 'GoogleLoginFailed',
        resourceType: 'User',
        newValue: `Account not found for email: ${email}`,
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error(
        '[GOOGLE AUTH] Failed to write account-not-found audit log:',
        auditError
      );
    }

    throw new AccountNotFoundError();
  }

  // Reject suspended users
  if (user.status === 'SUSPENDED') {
    try {
      await auditLogRepository.createAuditLog({
        actorId: user.id,
        targetUserId: user.id,
        action: 'GoogleLoginFailed',
        resourceType: 'User',
        newValue: 'Account is suspended',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error('[GOOGLE AUTH] Failed to write audit log:', auditError);
    }

    throw new AccountSuspendedError();
  }

  // Reject inactive users
  if (
    user.status === 'DEACTIVATED' ||
    user.status === 'INACTIVE'
  ) {
    try {
      await auditLogRepository.createAuditLog({
        actorId: user.id,
        targetUserId: user.id,
        action: 'GoogleLoginFailed',
        resourceType: 'User',
        newValue: 'Account is inactive',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error('[GOOGLE AUTH] Failed to write audit log:', auditError);
    }

    throw new AccountInactiveError();
  }

  // Reject deleted users
  if (
    user.status === 'REMOVED' ||
    user.status === 'DELETED'
  ) {
    try {
      await auditLogRepository.createAuditLog({
        actorId: user.id,
        targetUserId: user.id,
        action: 'GoogleLoginFailed',
        resourceType: 'User',
        newValue: 'Account is deleted',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error('[GOOGLE AUTH] Failed to write audit log:', auditError);
    }

    throw new AccountDeletedError();
  }

  // Link Google account if necessary
  let updatedUser = user;

  if (
    !user.googleId ||
    user.googleId !== sub ||
    user.authProvider !== 'GOOGLE'
  ) {
    try {
      updatedUser = await userRepository.linkGoogleAccount(
        user.id,
        sub,
        user.avatarUrl ? null : picture
      );
    } catch (error) {
      logger.error(
        '[GOOGLE AUTH] Failed to link Google account:',
        error
      );
      throw error;
    }

    try {
      await auditLogRepository.createAuditLog({
        actorId: user.id,
        targetUserId: user.id,
        action: 'GoogleAccountLinked',
        resourceType: 'User',
        oldValue: user.authProvider,
        newValue: 'GOOGLE',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error(
        '[GOOGLE AUTH] Failed to write account-linked audit log:',
        auditError
      );
    }

    logger.info(
      `[GOOGLE AUTH] Linked Google account for user ${user.email} (sub: ${sub})`
    );
  } else {
    try {
      await auditLogRepository.createAuditLog({
        actorId: user.id,
        targetUserId: user.id,
        action: 'GoogleLoginSuccess',
        resourceType: 'User',
        ipAddress,
        userAgent
      });
    } catch (auditError) {
      logger.error(
        '[GOOGLE AUTH] Failed to write login-success audit log:',
        auditError
      );
    }

    logger.info(
      `[GOOGLE AUTH] Google login success for user ${user.email}`
    );
  }

  return updatedUser;
};
