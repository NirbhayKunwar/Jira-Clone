from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.schemas.common import ApiResponse
from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.repositories.notification_repository import NotificationRepository

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=ApiResponse[list])
async def get_notifications(
    workspaceId: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    notif_repo = NotificationRepository(db)
    notifications = await notif_repo.get_user_notifications(
        user_id=current_user["id"],
        workspace_id=workspaceId
    )
    formatted = [
        {
            "id": n["id"],
            "title": n.get("title"),
            "message": n.get("message"),
            "type": n.get("type", "info"),
            "read": n.get("read", False),
            "createdAt": str(n.get("created_at", ""))
        } for n in notifications
    ]
    return ApiResponse(
        success=True,
        message="Notifications retrieved successfully.",
        data=formatted
    )
