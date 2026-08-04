from typing import Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base_repository import BaseRepository

class UserRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db["users"])

    async def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        if not email:
            return None
        return await self.find_one({"email": email.lower()})

    async def find_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        if not google_id:
            return None
        return await self.find_one({"google_id": google_id})

    async def link_google_account(self, user_id: str, google_id: str, avatar_url: Optional[str] = None) -> Optional[Dict[str, Any]]:
        update_data = {
            "google_id": google_id,
            "auth_provider": "GOOGLE"
        }
        if avatar_url:
            update_data["avatar_url"] = avatar_url
        return await self.update(user_id, update_data)
