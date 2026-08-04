from typing import Optional
from pydantic import BaseModel

class NotificationOut(BaseModel):
    id: str
    title: str
    message: str
    type: str
    read: bool = False
    userId: Optional[str] = None
    workspaceId: Optional[str] = None
    createdAt: Optional[str] = None
