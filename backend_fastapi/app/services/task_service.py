import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from bson import ObjectId
from app.repositories.task_repository import TaskRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.notification_repository import NotificationRepository
from app.core.exceptions import AppException, TaskAlreadyAssignedError

class TaskService:
    def __init__(
        self,
        task_repo: TaskRepository,
        workspace_repo: WorkspaceRepository,
        audit_repo: AuditRepository,
        notification_repo: NotificationRepository
    ):
        self.task_repo = task_repo
        self.workspace_repo = workspace_repo
        self.audit_repo = audit_repo
        self.notification_repo = notification_repo

    async def get_tasks(self, workspace_id: str, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
        has_access = await self.workspace_repo.is_user_workspace_member(workspace_id, current_user["id"])
        if not has_access:
            raise AppException("Forbidden. You do not have access to this workspace.", status_code=403, code="FORBIDDEN")
            
        tasks = await self.task_repo.get_workspace_tasks(workspace_id)
        
        # Map to frontend expected shape
        formatted_tasks = []
        for t in tasks:
            assignee_val = t.get("assignee") or t.get("assignee_name")
            if t.get("assignee_id") and str(t["assignee_id"]) == str(current_user["id"]):
                assignee_val = "You"
                
            formatted_tasks.append({
                "id": t["id"],
                "title": t.get("title", ""),
                "desc": t.get("desc_text") or t.get("desc", ""),
                "status": t.get("status", "todo"),
                "priority": t.get("priority", "Medium"),
                "epic": t.get("epic", "General"),
                "assignee": assignee_val,
                "assigneeId": str(t["assignee_id"]) if t.get("assignee_id") else None,
                "workspaceId": str(t["workspace_id"]) if t.get("workspace_id") else None,
                "createdAt": t.get("created_at").isoformat() if isinstance(t.get("created_at"), datetime) else str(t.get("created_at", "")),
                "completedAt": t.get("completed_at").isoformat() if isinstance(t.get("completed_at"), datetime) else None
            })
        return formatted_tasks

    async def create_task(self, task_data: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        workspace_id = task_data["workspaceId"]
        has_access = await self.workspace_repo.is_user_workspace_member(workspace_id, current_user["id"])
        if not has_access:
            raise AppException("Forbidden. You do not belong to this workspace.", status_code=403, code="FORBIDDEN")

        assignee_name = task_data.get("assignee")
        assignee_id = task_data.get("assigneeId")
        
        if assignee_name == "You" or (assignee_id and str(assignee_id) == str(current_user["id"])):
            assignee_name = current_user["name"]
            assignee_id = current_user["id"]

        now = datetime.now(timezone.utc)
        doc = {
            "title": task_data["title"],
            "desc_text": task_data.get("desc", ""),
            "status": task_data.get("status", "todo"),
            "priority": task_data.get("priority", "Medium"),
            "epic": task_data.get("epic", "General"),
            "assignee": assignee_name,
            "assignee_name": assignee_name,
            "assignee_id": ObjectId(assignee_id) if assignee_id and ObjectId.is_valid(assignee_id) else None,
            "workspace_id": ObjectId(workspace_id),
            "created_by": ObjectId(current_user["id"]),
            "created_at": now,
            "updated_at": now,
            "deleted": False
        }
        created = await self.task_repo.create(doc)

        # Non-blocking async notification write
        asyncio.create_task(self.notification_repo.add_notification(
            message=f"Task '{created['title']}' created by {current_user['name']}.",
            notif_type="task",
            user_id=current_user["id"],
            workspace_id=workspace_id
        ))

        return {
            "id": created["id"],
            "title": created["title"],
            "desc": created.get("desc_text", ""),
            "status": created["status"],
            "priority": created["priority"],
            "epic": created["epic"],
            "assignee": created.get("assignee"),
            "assigneeId": str(created["assignee_id"]) if created.get("assignee_id") else None,
            "workspaceId": str(created["workspace_id"]),
            "createdAt": now.isoformat()
        }

    async def claim_task(self, task_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
        task = await self.task_repo.find_by_id(task_id)
        if not task:
            raise AppException("Task not found.", status_code=404, code="TASK_NOT_FOUND")

        workspace_id = str(task["workspace_id"])
        has_access = await self.workspace_repo.is_user_workspace_member(workspace_id, current_user["id"])
        if not has_access:
            raise AppException("Forbidden. You do not belong to this project/workspace.", status_code=403, code="FORBIDDEN")

        if task.get("assignee_id") is not None:
            raise TaskAlreadyAssignedError()

        # Atomic claim query
        claimed = await self.task_repo.claim_task_atomic(task_id, current_user["id"], current_user["name"])
        if not claimed:
            raise TaskAlreadyAssignedError()

        updated_task = await self.task_repo.find_by_id(task_id)

        # Non-blocking async audit and notification writes
        asyncio.create_task(self.audit_repo.log_action(
            action="TaskClaimed",
            actor_id=current_user["id"],
            resource_type="Task",
            resource_id=task_id,
            new_value=f"Claimed by {current_user['name']}"
        ))

        asyncio.create_task(self.notification_repo.add_notification(
            message=f"Task '{updated_task['title']}' was claimed by {current_user['name']}.",
            notif_type="task",
            user_id=current_user["id"],
            workspace_id=workspace_id
        ))

        return {
            "id": updated_task["id"],
            "title": updated_task["title"],
            "desc": updated_task.get("desc_text", ""),
            "status": updated_task["status"],
            "priority": updated_task["priority"],
            "epic": updated_task["epic"],
            "assignee": current_user["name"],
            "assigneeId": current_user["id"],
            "workspaceId": workspace_id,
            "createdAt": str(updated_task.get("created_at", ""))
        }

    async def update_task(self, task_id: str, update_data: Dict[str, Any], current_user: Dict[str, Any]) -> Dict[str, Any]:
        task = await self.task_repo.find_by_id(task_id)
        if not task:
            raise AppException("Task not found.", status_code=404, code="TASK_NOT_FOUND")

        workspace_id = str(task["workspace_id"])
        has_access = await self.workspace_repo.is_user_workspace_member(workspace_id, current_user["id"])
        if not has_access:
            raise AppException("Forbidden. You do not belong to this workspace.", status_code=403, code="FORBIDDEN")

        mongo_update = {"updated_at": datetime.now(timezone.utc)}
        if "title" in update_data and update_data["title"] is not None:
            mongo_update["title"] = update_data["title"]
        if "desc" in update_data and update_data["desc"] is not None:
            mongo_update["desc_text"] = update_data["desc"]
        if "status" in update_data and update_data["status"] is not None:
            mongo_update["status"] = update_data["status"]
            mongo_update["completed_at"] = datetime.now(timezone.utc) if update_data["status"] == "done" else None
        if "priority" in update_data and update_data["priority"] is not None:
            mongo_update["priority"] = update_data["priority"]
        if "epic" in update_data and update_data["epic"] is not None:
            mongo_update["epic"] = update_data["epic"]

        updated = await self.task_repo.update(task_id, mongo_update)
        
        assignee_val = updated.get("assignee") or updated.get("assignee_name")
        if updated.get("assignee_id") and str(updated["assignee_id"]) == str(current_user["id"]):
            assignee_val = "You"

        return {
            "id": updated["id"],
            "title": updated.get("title", ""),
            "desc": updated.get("desc_text") or updated.get("desc", ""),
            "status": updated.get("status", "todo"),
            "priority": updated.get("priority", "Medium"),
            "epic": updated.get("epic", "General"),
            "assignee": assignee_val,
            "assigneeId": str(updated["assignee_id"]) if updated.get("assignee_id") else None,
            "workspaceId": workspace_id,
            "createdAt": updated.get("created_at").isoformat() if isinstance(updated.get("created_at"), datetime) else str(updated.get("created_at", "")),
            "completedAt": updated.get("completed_at").isoformat() if isinstance(updated.get("completed_at"), datetime) else None
        }

    async def delete_task(self, task_id: str, current_user: Dict[str, Any]) -> bool:
        task = await self.task_repo.find_by_id(task_id)
        if not task:
            raise AppException("Task not found.", status_code=404, code="TASK_NOT_FOUND")

        workspace_id = str(task["workspace_id"])
        has_access = await self.workspace_repo.is_user_workspace_member(workspace_id, current_user["id"])
        if not has_access:
            raise AppException("Forbidden. You do not belong to this workspace.", status_code=403, code="FORBIDDEN")

        return await self.task_repo.update(task_id, {"deleted": True, "updated_at": datetime.now(timezone.utc)})

