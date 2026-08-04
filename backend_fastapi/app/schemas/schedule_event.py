from typing import Optional
from pydantic import BaseModel

class ScheduleEventCreateSchema(BaseModel):
    title: str
    date: str
    time: Optional[str] = "10:00 AM"
    type: Optional[str] = "meeting"

class ScheduleEventOut(BaseModel):
    id: str
    title: str
    date: str
    time: str
    type: str
    userId: Optional[str] = None
    workspaceId: Optional[str] = None
    createdAt: Optional[str] = None
