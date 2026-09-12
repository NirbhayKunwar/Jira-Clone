from fastapi import APIRouter, Depends, Query, status
from typing import Optional, List
from bson import ObjectId
from app.schemas.common import ApiResponse
from app.schemas.workspace import WorkspaceCreateSchema, WorkspaceUpdateSchema, WorkspaceOut
from app.core.database import get_database
from app.core.exceptions import AppException
from app.dependencies.auth import get_current_user
from app.repositories.workspace_repository import WorkspaceRepository

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

@router.get("", response_model=ApiResponse[dict])
async def get_workspaces(current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    ws_repo = WorkspaceRepository(db)
    workspaces = await ws_repo.get_user_workspaces(current_user["id"])
    formatted = [
        {
            "id": w["id"],
            "name": w["name"],
            "key": w["key"],
            "template_type": w.get("template_type", "kanban"),
            "board_name": w.get("board_name", "Main Board"),
            "description": w.get("description", ""),
            "sprint_duration": w.get("sprint_duration", 2),
            "wip_limit": w.get("wip_limit", 5),
            "owner_id": str(w.get("owner_id")) if w.get("owner_id") else None
        } for w in workspaces
    ]
    return ApiResponse(success=True, message="Workspaces fetched successfully.", data={"workspaces": formatted})

@router.post("", response_model=ApiResponse[dict])
async def create_workspace(
    payload: WorkspaceCreateSchema,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    ws_repo = WorkspaceRepository(db)
    existing = await db["workspaces"].find_one({
        "owner_id": ObjectId(current_user["id"]),
        "key": payload.key.upper()
    })
    if existing:
        raise AppException(f"You already have a workspace with project key '{payload.key.upper()}'. Please choose a different key.", status_code=400, code="KEY_EXISTS")

    doc = {
        "name": payload.name,
        "key": payload.key.upper(),
        "template_type": payload.templateType or "kanban",
        "board_name": payload.boardName or "Main Board",
        "description": payload.description or "",
        "sprint_duration": payload.sprintDuration or 2,
        "wip_limit": payload.wipLimit or 5,
        "owner_id": ObjectId(current_user["id"]),
        "status": "ACTIVE"
    }
    created = await ws_repo.create(doc)
    
    # Create owner workspace_member document
    await db["workspace_members"].insert_one({
        "workspace_id": ObjectId(created["id"]),
        "user_id": ObjectId(current_user["id"]),
        "role": "OWNER",
        "status": "ACTIVE"
    })

    return ApiResponse(
        success=True,
        message="Workspace created successfully.",
        data={
            "workspace": {
                "id": created["id"],
                "name": created["name"],
                "key": created["key"],
                "template_type": created["template_type"],
                "board_name": created["board_name"],
                "owner_id": current_user["id"]
            }
        }
    )

@router.get("/{id}", response_model=ApiResponse[dict])
async def get_workspace_by_id(id: str, current_user: dict = Depends(get_current_user), db = Depends(get_database)):
    ws_repo = WorkspaceRepository(db)
    has_access = await ws_repo.is_user_workspace_member(id, current_user["id"])
    if not has_access:
        raise AppException("Forbidden. You do not have access to this workspace.", status_code=403, code="FORBIDDEN")

    ws = await ws_repo.find_by_id(id)
    if not ws:
        raise AppException("Workspace not found.", status_code=404, code="NOT_FOUND")

    return ApiResponse(
        success=True,
        message="Workspace details fetched.",
        data={
            "id": ws["id"],
            "name": ws["name"],
            "key": ws["key"],
            "template_type": ws.get("template_type", "kanban"),
            "board_name": ws.get("board_name", "Main Board"),
            "owner_id": str(ws.get("owner_id")) if ws.get("owner_id") else None
        }
    )
