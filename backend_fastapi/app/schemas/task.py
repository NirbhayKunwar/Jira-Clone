from typing import Optional
from pydantic import BaseModel, Field, ConfigDict

class TaskCreateSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: str
    desc: Optional[str] = Field(default="", alias="desc_text")
    status: Optional[str] = "todo"
    priority: Optional[str] = "Medium"
    epic: Optional[str] = "General"
    assignee: Optional[str] = "You"
    assigneeId: Optional[str] = Field(default=None, alias="assignee_id")
    workspaceId: str = Field(..., alias="workspace_id")

class TaskUpdateSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    title: Optional[str] = None
    desc: Optional[str] = Field(default=None, alias="desc_text")
    status: Optional[str] = None
    priority: Optional[str] = None
    epic: Optional[str] = None
    assignee: Optional[str] = None
    assigneeId: Optional[str] = Field(default=None, alias="assignee_id")
    workspaceId: Optional[str] = Field(default=None, alias="workspace_id")

class TaskOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    desc: Optional[str] = Field(default="", alias="desc_text")
    status: str
    priority: str
    epic: str
    assignee: Optional[str] = None
    assigneeId: Optional[str] = Field(default=None, alias="assignee_id")
    workspaceId: Optional[str] = Field(default=None, alias="workspace_id")
    createdAt: Optional[str] = Field(default=None, alias="created_at")
    completedAt: Optional[str] = Field(default=None, alias="completed_at")
