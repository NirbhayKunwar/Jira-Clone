from typing import Optional, Dict, Any
from fastapi import Request, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
from app.core.database import get_database
from app.repositories.user_repository import UserRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/signin", auto_error=False)

async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db = Depends(get_database)
) -> Dict[str, Any]:
    # Clean string representation of invalid tokens
    if token in ["null", "undefined", "", "None"]:
        token = None

    # Check cookie fallback if Bearer header token not provided or invalid string
    if not token:
        token = request.cookies.get("jira_token")

    if not token or token in ["null", "undefined", "", "None"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing token."
        )

    payload = decode_token(token)
    if not payload or "id" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )

    user_repo = UserRepository(db)
    user = await user_repo.find_by_id(payload["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this token no longer exists."
        )

    if user.get("token_version") != payload.get("tokenVersion"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or password changed. Please sign in again."
        )

    if user.get("status") in ["SUSPENDED", "DEACTIVATED", "INACTIVE", "DELETED", "REMOVED"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is not active."
        )

    return user
