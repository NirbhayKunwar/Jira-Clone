from fastapi import Request, status
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "BAD_REQUEST"):
        self.message = message
        self.status_code = status_code
        self.code = code

class AccountNotFoundError(AppException):
    def __init__(self, message: str = "No account exists with this email. Please sign up before using Google Sign-In."):
        super().__init__(message=message, status_code=403, code="ACCOUNT_NOT_FOUND")

class AccountInactiveError(AppException):
    def __init__(self, message: str = "Your account is inactive. Please contact support."):
        super().__init__(message=message, status_code=403, code="ACCOUNT_INACTIVE")

class AccountSuspendedError(AppException):
    def __init__(self, message: str = "Your account has been suspended."):
        super().__init__(message=message, status_code=403, code="ACCOUNT_SUSPENDED")

class AccountDeletedError(AppException):
    def __init__(self, message: str = "Your account has been deleted."):
        super().__init__(message=message, status_code=403, code="ACCOUNT_DELETED")

class InvalidTokenError(AppException):
    def __init__(self, message: str = "Google SSO token verification failed."):
        super().__init__(message=message, status_code=401, code="INVALID_TOKEN")

class TaskAlreadyAssignedError(AppException):
    def __init__(self, message: str = "Task has already been assigned"):
        super().__init__(message=message, status_code=409, code="TASK_ALREADY_ASSIGNED")

async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": exc.code,
            "message": exc.message,
            "data": None
        }
    )
