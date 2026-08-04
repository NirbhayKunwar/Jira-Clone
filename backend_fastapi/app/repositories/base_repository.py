from typing import Any, Dict, List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection

class BaseRepository:
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection

    def _to_id_str(self, doc: Dict[str, Any]) -> Dict[str, Any]:
        if not doc:
            return doc
        if "_id" in doc:
            doc["id"] = str(doc["_id"])
        return doc

    async def find_by_id(self, id_str: str) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(id_str):
            return None
        doc = await self.collection.find_one({"_id": ObjectId(id_str)})
        return self._to_id_str(doc)

    async def find_one(self, filter_query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        doc = await self.collection.find_one(filter_query)
        return self._to_id_str(doc)

    async def find_many(
        self, filter_query: Dict[str, Any], limit: int = 100, skip: int = 0, sort_by: str = "_id", direction: int = -1
    ) -> List[Dict[str, Any]]:
        cursor = self.collection.find(filter_query).sort(sort_by, direction).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [self._to_id_str(doc) for doc in docs]

    async def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.collection.insert_one(data)
        data["id"] = str(result.inserted_id)
        data["_id"] = result.inserted_id
        return data

    async def update(self, id_str: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not ObjectId.is_valid(id_str):
            return None
        await self.collection.update_one({"_id": ObjectId(id_str)}, {"$set": update_data})
        return await self.find_by_id(id_str)

    async def delete(self, id_str: str) -> bool:
        if not ObjectId.is_valid(id_str):
            return False
        result = await self.collection.delete_one({"_id": ObjectId(id_str)})
        return result.deleted_count > 0
