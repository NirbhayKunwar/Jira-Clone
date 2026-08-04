from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websockets.manager import ws_manager

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws")
@router.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Handle incoming WebSocket events or ping-pong
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
