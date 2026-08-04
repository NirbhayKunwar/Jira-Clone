from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base_repository import BaseRepository

class NotificationRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db["notifications"])

    async def add_notification(
        self,
        message: str,
        notif_type: str = "info",
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        workspace_id: Optional[str] = None
    ) -> Dict[str, Any]:
        derived_title = title or (
            "Task Update" if notif_type == "task" else
            "Member Activity" if notif_type == "member" else
            "Team Workspace Update" if notif_type == "team" else
            "Goal Update" if notif_type == "goal" else
            "System Notification"
        )
        data = {
            "title": derived_title,
            "message": message,
            "type": notif_type,
            "read": False,
            "user_id": ObjectId(user_id) if user_id and ObjectId.is_valid(user_id) else None,
            "workspace_id": ObjectId(workspace_id) if workspace_id and ObjectId.is_valid(workspace_id) else None,
            "deleted": False,
            "created_at": datetime.now(timezone.utc)
        }
        return await self.create(data)

    async def get_user_notifications(self, user_id: str, workspace_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"deleted": False}
        if user_id and ObjectId.is_valid(user_id):
            query["user_id"] = ObjectId(user_id)
        if workspace_id and ObjectId.is_valid(workspace_id):
            query["workspace_id"] = ObjectId(workspace_id)
            
        cursor = self.collection.find(query).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_id_str(doc) for doc in docs]
