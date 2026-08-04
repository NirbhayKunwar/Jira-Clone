from fastapi import APIRouter
from app.api.v1.endpoints import auth, workspaces, tasks, notifications, websockets

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(tasks.router)
api_router.include_router(notifications.router)
api_router.include_router(websockets.router)
