from typing import Optional, Dict, Any, List
from bson import ObjectId
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base_repository import BaseRepository

class TaskRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db["tasks"])

    async def get_workspace_tasks(self, workspace_id: str) -> List[Dict[str, Any]]:
        if not ObjectId.is_valid(workspace_id):
            return []
        cursor = self.collection.find(
            {
                "workspace_id": ObjectId(workspace_id),
                "deleted": {"$ne": True}
            },
            projection={
                "_id": 1,
                "title": 1,
                "desc": 1,
                "status": 1,
                "priority": 1,
                "epic": 1,
                "assignee": 1,
                "assignee_id": 1,
                "assignee_name": 1,
                "workspace_id": 1,
                "created_at": 1,
                "updated_at": 1,
                "completed_at": 1
            }
        ).sort([("workspace_id", 1), ("deleted", 1), ("created_at", -1)])
        
        docs = await cursor.to_list(length=500)
        return [self._to_id_str(doc) for doc in docs]

    async def claim_task_atomic(self, task_id: str, user_id: str, user_name: str) -> bool:
        if not ObjectId.is_valid(task_id) or not ObjectId.is_valid(user_id):
            return False

        # Atomic conditional update: where _id = task_id AND assignee_id IS None
        result = await self.collection.update_one(
            {
                "_id": ObjectId(task_id),
                "assignee_id": None
            },
            {
                "$set": {
                    "assignee_id": ObjectId(user_id),
                    "assignee_name": user_name,
                    "assignee": user_name,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        return result.modified_count > 0
