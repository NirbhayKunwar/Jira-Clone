import httpx
from typing import Dict, Any
from app.core.config import settings
from app.repositories.user_repository import UserRepository
from app.repositories.audit_repository import AuditRepository
from app.core.exceptions import (
    AccountNotFoundError,
    AccountInactiveError,
    AccountSuspendedError,
    AccountDeletedError,
    InvalidTokenError
)

class GoogleAuthService:
    def __init__(self, user_repo: UserRepository, audit_repo: AuditRepository):
        self.user_repo = user_repo
        self.audit_repo = audit_repo

    async def verify_google_token(self, credential: str) -> Dict[str, Any]:
        if not credential:
            raise InvalidTokenError("Google ID token is required.")

        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}")
            if resp.status_code != 200:
                raise InvalidTokenError("Google SSO token verification failed.")
            payload = resp.json()

        # Issuer check (iss)
        valid_issuers = ["accounts.google.com", "https://accounts.google.com"]
        if not payload.get("iss") or payload["iss"] not in valid_issuers:
            raise InvalidTokenError("Invalid token issuer.")

        # Audience check (aud)
        if payload.get("aud") != settings.GOOGLE_CLIENT_ID:
            raise InvalidTokenError("Invalid token audience.")

        # Email verified check
        email_verified = payload.get("email_verified")
        if email_verified is not True and email_verified != "true":
            raise InvalidTokenError("Google account email is not verified.")

        email = payload.get("email")
        sub = payload.get("sub")
        if not email or not sub:
            raise InvalidTokenError("Could not extract email or provider ID from Google token.")

        return {
            "sub": sub,
            "email": email.lower(),
            "name": payload.get("name") or email.split("@")[0],
            "picture": payload.get("picture")
        }

    async def handle_google_login(
        self, credential: str, ip_address: str = None, user_agent: str = None
    ) -> Dict[str, Any]:
        try:
            google_user = await self.verify_google_token(credential)
        except Exception as err:
            await self.audit_repo.log_action(
                action="GoogleLoginFailed",
                resource_type="User",
                new_value=str(err),
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise err

        email = google_user["email"]
        sub = google_user["sub"]
        picture = google_user["picture"]

        # Search database for existing user
        user = await self.user_repo.find_by_email(email)

        # Business Rule: Never create user automatically from Google OAuth
        if not user:
            await self.audit_repo.log_action(
                action="GoogleLoginFailed",
                resource_type="User",
                new_value=f"Account not found for email: {email}",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise AccountNotFoundError()

        status = user.get("status", "ACTIVE")
        user_id = user["id"]

        # Status Checks
        if status == "SUSPENDED":
            await self.audit_repo.log_action(
                action="GoogleLoginFailed",
                actor_id=user_id,
                target_user_id=user_id,
                resource_type="User",
                new_value="Account is suspended",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise AccountSuspendedError()

        if status in ["DEACTIVATED", "INACTIVE"]:
            await self.audit_repo.log_action(
                action="GoogleLoginFailed",
                actor_id=user_id,
                target_user_id=user_id,
                resource_type="User",
                new_value="Account is inactive",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise AccountInactiveError()

        if status in ["REMOVED", "DELETED"]:
            await self.audit_repo.log_action(
                action="GoogleLoginFailed",
                actor_id=user_id,
                target_user_id=user_id,
                resource_type="User",
                new_value="Account is deleted",
                ip_address=ip_address,
                user_agent=user_agent
            )
            raise AccountDeletedError()

        # Link Google account if not previously linked
        if user.get("google_id") != sub or user.get("auth_provider") != "GOOGLE":
            user = await self.user_repo.link_google_account(
                user_id=user_id,
                google_id=sub,
                avatar_url=None if user.get("avatar_url") else picture
            )
            await self.audit_repo.log_action(
                action="GoogleAccountLinked",
                actor_id=user_id,
                target_user_id=user_id,
                resource_type="User",
                old_value=user.get("auth_provider", "LOCAL"),
                new_value="GOOGLE",
                ip_address=ip_address,
                user_agent=user_agent
            )
        else:
            await self.audit_repo.log_action(
                action="GoogleLoginSuccess",
                actor_id=user_id,
                target_user_id=user_id,
                resource_type="User",
                ip_address=ip_address,
                user_agent=user_agent
            )

        return user
