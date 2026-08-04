from typing import Optional
from pydantic import BaseModel

class TaskCreateSchema(BaseModel):
    title: str
    desc: Optional[str] = ""
    status: Optional[str] = "todo"
    priority: Optional[str] = "Medium"
    epic: Optional[str] = "General"
    assignee: Optional[str] = "You"
    assigneeId: Optional[str] = None
    workspaceId: str

class TaskUpdateSchema(BaseModel):
    title: Optional[str] = None
    desc: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    epic: Optional[str] = None
    assignee: Optional[str] = None
    assigneeId: Optional[str] = None
    workspaceId: Optional[str] = None

class TaskOut(BaseModel):
    id: str
    title: str
    desc: Optional[str] = ""
    status: str
    priority: str
    epic: str
    assignee: Optional[str] = None
    assigneeId: Optional[str] = None
    workspaceId: Optional[str] = None
    createdAt: Optional[str] = None
    completedAt: Optional[str] = None
