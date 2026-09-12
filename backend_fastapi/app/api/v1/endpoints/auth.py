from fastapi import APIRouter, Depends, Request, Response, status, Query
from app.schemas.common import ApiResponse
from app.schemas.auth import SignUpSchema, SignInSchema, GoogleSignInSchema, SendOtpSchema, ChangePasswordSchema
from app.schemas.user import UserOut, UpdateProfileSchema, AddTeamMemberSchema
from app.core.database import get_database
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, get_password_hash, verify_password
from app.core.exceptions import AppException
from app.dependencies.auth import get_current_user
from app.repositories.user_repository import UserRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.audit_repository import AuditRepository
from app.services.google_auth_service import GoogleAuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

import os

def set_auth_cookies(response: Response, user_id: str, email: str, token_version: int = 1):
    payload = {"id": user_id, "email": email, "tokenVersion": token_version}
    access_token = create_access_token(payload)
    refresh_token = create_refresh_token(payload)
    
    is_secure = os.getenv("COOKIE_SECURE", "").lower() == "true"

    response.set_cookie(
        key="jira_token",
        value=access_token,
        httponly=True,
        secure=is_secure,
        max_age=15 * 60,
        samesite="none" if is_secure else "lax",
        path="/"
    )
    response.set_cookie(
        key="jira_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_secure,
        max_age=7 * 24 * 60 * 60,
        samesite="none" if is_secure else "lax",
        path="/"
    )

@router.post("/signup", response_model=ApiResponse[dict])
async def signup(payload: SignUpSchema, response: Response, db = Depends(get_database)):
    user_repo = UserRepository(db)
    existing = await user_repo.find_by_email(payload.email)
    if existing:
        raise AppException("An account with this email address already exists.", status_code=400, code="EMAIL_EXISTS")

    doc = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password": get_password_hash(payload.password),
        "role": "Full Stack Engineer",
        "dept": "Core Engineering",
        "auth_provider": "LOCAL",
        "rbac_role": "MEMBER",
        "token_version": 1,
        "status": "ACTIVE"
    }
    user = await user_repo.create(doc)
    set_auth_cookies(response, user["id"], user["email"])

    return ApiResponse(
        success=True,
        message="User registered successfully.",
        data={
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "username": f"@{user['email'].split('@')[0]}",
                "role": user.get("role", "Full Stack Engineer"),
                "dept": user.get("dept", "Core Engineering"),
                "rbacRole": user.get("rbac_role", "MEMBER")
            }
        }
    )

@router.post("/signin", response_model=ApiResponse[dict])
async def signin(payload: SignInSchema, response: Response, db = Depends(get_database)):
    user_repo = UserRepository(db)
    user = await user_repo.find_by_email(payload.email)
    if not user or not user.get("password") or not verify_password(payload.password, user["password"]):
        raise AppException("Invalid email or password.", status_code=401, code="INVALID_CREDENTIALS")

    set_auth_cookies(response, user["id"], user["email"])

    return ApiResponse(
        success=True,
        message="Logged in successfully.",
        data={
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "username": f"@{user['email'].split('@')[0]}",
                "role": user.get("role", "Full Stack Engineer"),
                "dept": user.get("dept", "Core Engineering"),
                "rbacRole": user.get("rbac_role", "MEMBER")
            }
        }
    )

@router.post("/google-signin", response_model=ApiResponse[dict])
async def google_signin(
    payload: GoogleSignInSchema,
    request: Request,
    response: Response,
    db = Depends(get_database)
):
    user_repo = UserRepository(db)
    audit_repo = AuditRepository(db)
    google_service = GoogleAuthService(user_repo, audit_repo)

    user = await google_service.handle_google_login(
        credential=payload.credential,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )

    set_auth_cookies(response, user["id"], user["email"])

    return ApiResponse(
        success=True,
        message="Logged in successfully with Google.",
        data={
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "username": f"@{user['email'].split('@')[0]}",
                "role": user.get("role", "Full Stack Engineer"),
                "dept": user.get("dept", "Core Engineering"),
                "avatarUrl": user.get("avatar_url"),
                "rbacRole": user.get("rbac_role", "MEMBER")
            }
        }
    )

@router.post("/signout", response_model=ApiResponse[dict])
async def signout(response: Response):
    cookie_options = {"path": "/", "secure": settings.ENVIRONMENT == "production", "samesite": "lax"}
    response.delete_cookie("jira_token", **cookie_options)
    response.delete_cookie("jira_refresh_token", **cookie_options)
    return ApiResponse(success=True, message="Signed out successfully.", data=None)

@router.get("/users", response_model=ApiResponse[dict])
async def get_users(
    workspaceId: str = Query(..., description="Workspace ID required"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    workspace_repo = WorkspaceRepository(db)
    if not await workspace_repo.is_user_workspace_member(workspaceId, current_user["id"]):
        raise AppException("Forbidden. You do not have access to this workspace.", status_code=403, code="FORBIDDEN")

    user_ids = await workspace_repo.get_workspace_user_ids(workspaceId)
    user_repo = UserRepository(db)
    users = await user_repo.find_many({
        "_id": {"$in": user_ids},
        "status": {"$ne": "DELETED"}
    }, limit=200)
    formatted = [
        {
            "id": u["id"],
            "name": u.get("name"),
            "email": u.get("email"),
            "role": u.get("role", "Full Stack Engineer"),
            "dept": u.get("dept", "Core Engineering"),
            "rbacRole": u.get("rbac_role", "MEMBER")
        } for u in users
    ]
    return ApiResponse(success=True, message="Users fetched successfully.", data={"users": formatted})

@router.put("/profile", response_model=ApiResponse[dict])
async def update_profile(
    payload: UpdateProfileSchema,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    user_repo = UserRepository(db)
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "hasConfiguredWorkspace" in update_data:
        update_data["has_configured_workspace"] = update_data.pop("hasConfiguredWorkspace")

    updated = await user_repo.update(current_user["id"], update_data)
    return ApiResponse(
        success=True,
        message="Profile details updated successfully.",
        data={
            "id": updated["id"],
            "name": updated["name"],
            "email": updated["email"],
            "role": updated.get("role"),
            "dept": updated.get("dept"),
            "hasConfiguredWorkspace": updated.get("has_configured_workspace", False)
        }
    )
