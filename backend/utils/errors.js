export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

export class AccountNotFoundError extends AppError {
  constructor(message = 'No account exists with this email. Please sign up before using Google Sign-In.') {
    super(message, 403, 'ACCOUNT_NOT_FOUND');
  }
}

export class AccountInactiveError extends AppError {
  constructor(message = 'Your account is inactive. Please contact support.') {
    super(message, 403, 'ACCOUNT_INACTIVE');
  }
}

export class AccountSuspendedError extends AppError {
  constructor(message = 'Your account has been suspended.') {
    super(message, 403, 'ACCOUNT_SUSPENDED');
  }
}

export class AccountDeletedError extends AppError {
  constructor(message = 'Your account has been deleted.') {
    super(message, 403, 'ACCOUNT_DELETED');
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Google SSO token verification failed.') {
    super(message, 401, 'INVALID_TOKEN');
  }
}
