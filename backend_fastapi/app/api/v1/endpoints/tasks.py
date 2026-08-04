from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from app.schemas.common import ApiResponse
from app.schemas.task import TaskCreateSchema, TaskUpdateSchema, TaskOut
from app.core.database import get_database
from app.dependencies.auth import get_current_user
from app.repositories.task_repository import TaskRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.notification_repository import NotificationRepository
from app.services.task_service import TaskService
from app.websockets.manager import ws_manager

router = APIRouter(prefix="/tasks", tags=["Tasks"])

def get_task_service(db = Depends(get_database)) -> TaskService:
    return TaskService(
        task_repo=TaskRepository(db),
        workspace_repo=WorkspaceRepository(db),
        audit_repo=AuditRepository(db),
        notification_repo=NotificationRepository(db)
    )

@router.get("", response_model=ApiResponse[dict])
async def get_tasks(
    workspaceId: str = Query(..., description="Workspace ID required"),
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service)
):
    tasks = await service.get_tasks(workspaceId, current_user)
    return ApiResponse(
        success=True,
        message="Tasks retrieved successfully.",
        data={"tasks": tasks}
    )

@router.post("", response_model=ApiResponse[dict])
async def create_task(
    payload: TaskCreateSchema,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service)
):
    created = await service.create_task(payload.model_dump(), current_user)
    
    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "TASK_CREATED",
        "workspaceId": payload.workspaceId,
        "task": created
    })

    return ApiResponse(
        success=True,
        message="Task created successfully.",
        data={"task": created}
    )

@router.put("/{id}/claim", response_model=ApiResponse[dict])
async def claim_task(
    id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service)
):
    claimed = await service.claim_task(id, current_user)
    
    # Real-time WebSocket broadcast
    await ws_manager.broadcast({
        "event": "TASK_CLAIMED",
        "taskId": id,
        "task": claimed
    })

    return ApiResponse(
        success=True,
        code="TASK_CLAIMED_SUCCESS",
        message="Task claimed successfully.",
        data=claimed
    )
