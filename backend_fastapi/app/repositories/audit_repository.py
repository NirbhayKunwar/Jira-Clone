from typing import Optional, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base_repository import BaseRepository

class AuditRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db["audit_logs"])

    async def log_action(
        self,
        action: str,
        actor_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        resource_type: str = "User",
        resource_id: Optional[str] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        data = {
            "action": action,
            "actor_id": ObjectId(actor_id) if actor_id and ObjectId.is_valid(actor_id) else None,
            "target_user_id": ObjectId(target_user_id) if target_user_id and ObjectId.is_valid(target_user_id) else None,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "old_value": old_value,
            "new_value": new_value,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.now(timezone.utc)
        }
        return await self.create(data)
