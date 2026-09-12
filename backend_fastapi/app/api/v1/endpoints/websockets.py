from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status, Query
from app.websockets.manager import ws_manager
from app.core.security import decode_token
from app.core.database import get_database
from app.core.config import settings
from bson import ObjectId

router = APIRouter(tags=["WebSockets"])

async def authenticate_websocket(websocket: WebSocket, db) -> Optional[dict]:
    # Authentication is cookie-only so access tokens do not leak through URL logs.
    ws_token = websocket.cookies.get("jira_token")
    if not ws_token or ws_token in ["null", "undefined", "", "None"]:
        return None

    payload = decode_token(ws_token)
    if not payload or "id" not in payload or not ObjectId.is_valid(payload["id"]):
        return None

    user = await db["users"].find_one({"_id": ObjectId(payload["id"])})
    if not user or user.get("status") in ["SUSPENDED", "DEACTIVATED", "INACTIVE", "DELETED", "REMOVED"]:
        return None

    if user.get("token_version") != payload.get("tokenVersion"):
        return None

    return payload

@router.websocket("/ws")
@router.websocket("/api/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    workspace_id: Optional[str] = Query(None)
):
    origin = websocket.headers.get("origin")
    if origin and origin not in settings.CORS_ORIGINS:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized origin.")
        return

    db = get_database()
    user_payload = await authenticate_websocket(websocket, db)
    if not user_payload:
        # Reject connection with Policy Violation code for unauthenticated sockets
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Unauthorized access: Valid authentication token required.")
        return

    user_id = user_payload["id"]
    await ws_manager.connect(websocket, user_id=user_id)

    # Auto-subscribe to workspace if workspace_id provided in query param
    if workspace_id:
        subscribed = await ws_manager.subscribe_workspace(websocket, workspace_id, db=db)
        if not subscribed:
            await websocket.send_json({
                "type": "error",
                "message": f"Unauthorized access to workspace {workspace_id}"
            })

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif event_type == "subscribe":
                target_ws_id = data.get("workspaceId") or data.get("workspace_id")
                if target_ws_id:
                    subscribed = await ws_manager.subscribe_workspace(websocket, target_ws_id, db=db)
                    await websocket.send_json({
                        "type": "subscribed" if subscribed else "error",
                        "workspaceId": target_ws_id,
                        "status": "success" if subscribed else "forbidden"
                    })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
