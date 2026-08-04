from typing import Optional, Dict, Any, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.repositories.base_repository import BaseRepository

class WorkspaceRepository(BaseRepository):
    def __init__(self, db: AsyncIOMotorDatabase):
        super().__init__(db["workspaces"])
        self.member_collection = db["workspace_members"]

    async def find_by_key(self, key: str) -> Optional[Dict[str, Any]]:
        return await self.find_one({"key": key.upper()})

    async def is_user_workspace_member(self, workspace_id: str, user_id: str) -> bool:
        if not ObjectId.is_valid(workspace_id) or not ObjectId.is_valid(user_id):
            return False
            
        # Check workspace_members collection
        member = await self.member_collection.find_one({
            "workspace_id": ObjectId(workspace_id),
            "user_id": ObjectId(user_id),
            "status": "ACTIVE"
        })
        if member:
            return True
            
        # Check workspace owner
        ws = await self.find_by_id(workspace_id)
        if ws and str(ws.get("owner_id")) == user_id:
            return True
            
        return False

    async def get_user_workspaces(self, user_id: str) -> List[Dict[str, Any]]:
        if not ObjectId.is_valid(user_id):
            return []
            
        # Get workspace IDs from members
        cursor = self.member_collection.find({
            "user_id": ObjectId(user_id),
            "status": "ACTIVE"
        })
        memberships = await cursor.to_list(length=100)
        ws_ids = [m["workspace_id"] for m in memberships if "workspace_id" in m]
        
        # Also find owned workspaces
        owned_cursor = self.collection.find({"owner_id": ObjectId(user_id)})
        owned = await owned_cursor.to_list(length=100)
        for o in owned:
            if o["_id"] not in ws_ids:
                ws_ids.append(o["_id"])

        cursor = self.collection.find({"_id": {"$in": ws_ids}})
        workspaces = await cursor.to_list(length=100)
        return [self._to_id_str(w) for w in workspaces]
