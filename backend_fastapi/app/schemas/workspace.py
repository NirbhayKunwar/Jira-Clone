from typing import Optional, List
from pydantic import BaseModel

class WorkspaceCreateSchema(BaseModel):
    name: str
    key: str
    templateType: Optional[str] = "kanban"
    boardName: Optional[str] = "Main Board"
    description: Optional[str] = ""
    sprintDuration: Optional[int] = 2
    wipLimit: Optional[int] = 5

class WorkspaceUpdateSchema(BaseModel):
    name: Optional[str] = None
    key: Optional[str] = None
    templateType: Optional[str] = None
    boardName: Optional[str] = None
    description: Optional[str] = None
    sprintDuration: Optional[int] = None
    wipLimit: Optional[int] = None

class WorkspaceOut(BaseModel):
    id: str
    name: str
    key: str
    templateType: Optional[str] = "kanban"
    boardName: Optional[str] = "Main Board"
    description: Optional[str] = ""
    sprintDuration: Optional[int] = 2
    wipLimit: Optional[int] = 5
    ownerId: Optional[str] = None
    createdAt: Optional[str] = None

class WorkspaceMemberOut(BaseModel):
    id: str
    workspaceId: str
    userId: str
    role: str
    user: Optional[dict] = None
