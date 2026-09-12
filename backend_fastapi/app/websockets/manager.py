import logging
from typing import Dict, Set, Optional
from bson import ObjectId
from fastapi import WebSocket, status

logger = logging.getLogger("jira_fastapi")

class ConnectionManager:
    def __init__(self):
        # Maps workspace_id -> set of active WebSockets
        self.workspace_rooms: Dict[str, Set[WebSocket]] = {}
        # Maps websocket -> tuple of (user_id, set of subscribed workspace_ids)
        self.connection_meta: Dict[WebSocket, Dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.connection_meta[websocket] = {
            "user_id": user_id,
            "workspaces": set()
        }
        logger.info(f"[WEBSOCKET] Client connected for user {user_id}.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connection_meta:
            meta = self.connection_meta.pop(websocket)
            for ws_id in meta.get("workspaces", set()):
                if ws_id in self.workspace_rooms:
                    self.workspace_rooms[ws_id].discard(websocket)
                    if not self.workspace_rooms[ws_id]:
                        del self.workspace_rooms[ws_id]
            logger.info(f"[WEBSOCKET] Client disconnected for user {meta.get('user_id')}.")

    async def subscribe_workspace(self, websocket: WebSocket, workspace_id: str, db=None) -> bool:
        if websocket not in self.connection_meta:
            return False

        meta = self.connection_meta[websocket]
        user_id = str(meta["user_id"])

        if db is None:
            return False

        ws_ids = [workspace_id]
        if ObjectId.is_valid(workspace_id):
            ws_ids.append(ObjectId(workspace_id))

        user_ids = [user_id]
        if ObjectId.is_valid(user_id):
            user_ids.append(ObjectId(user_id))

        # Check workspace ownership or membership, matching string and ObjectId representations
        ws_doc = await db["workspaces"].find_one({"_id": {"$in": ws_ids}})
        owner_id = str(ws_doc.get("owner_id")) if ws_doc and ws_doc.get("owner_id") else None
        is_owner = bool(ws_doc and owner_id == user_id)

        is_member = False
        if not is_owner:
            member_doc = await db["workspace_members"].find_one({
                "workspace_id": {"$in": ws_ids},
                "user_id": {"$in": user_ids},
                "status": {"$in": ["ACTIVE", "active"]}
            })
            is_member = member_doc is not None

        if not is_owner and not is_member:
            logger.warning(f"[WEBSOCKET AUTH FAIL] User {user_id} attempted unauthorized subscription to workspace {workspace_id}")
            return False

        # Clear socket from any previously subscribed workspace rooms to avoid stale room leaks
        for old_ws_id in list(meta.get("workspaces", set())):
            if old_ws_id != workspace_id and old_ws_id in self.workspace_rooms:
                self.workspace_rooms[old_ws_id].discard(websocket)
                if not self.workspace_rooms[old_ws_id]:
                    del self.workspace_rooms[old_ws_id]
        meta["workspaces"] = {workspace_id}

        if workspace_id not in self.workspace_rooms:
            self.workspace_rooms[workspace_id] = set()

        self.workspace_rooms[workspace_id].add(websocket)
        logger.info(f"[WEBSOCKET] User {user_id} subscribed to workspace channel {workspace_id}")
        return True

    async def broadcast_to_workspace(self, workspace_id: str, message: Dict):
        room = self.workspace_rooms.get(workspace_id, set())
        stale_sockets = []
        for connection in room:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"[WEBSOCKET ERROR] Failed to send message to workspace {workspace_id}: {e}")
                stale_sockets.append(connection)

        for stale in stale_sockets:
            self.disconnect(stale)

    async def broadcast(self, message_or_ws_id: any, message: Optional[Dict] = None):
        """
        Fallback/alias method for broadcasting messages to prevent 500 errors if
        producers call .broadcast(...) instead of .broadcast_to_workspace(...).
        """
        if isinstance(message_or_ws_id, str) and message is not None:
            await self.broadcast_to_workspace(message_or_ws_id, message)
        elif isinstance(message_or_ws_id, dict):
            for ws_id in list(self.workspace_rooms.keys()):
                await self.broadcast_to_workspace(ws_id, message_or_ws_id)
        elif message is not None:
            await self.broadcast_to_workspace(str(message_or_ws_id), message)

ws_manager = ConnectionManager()
