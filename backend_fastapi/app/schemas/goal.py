from typing import Optional
from pydantic import BaseModel

class GoalCreateSchema(BaseModel):
    title: str
    desc: Optional[str] = ""
    status: Optional[str] = "In Progress"
    targetDate: Optional[str] = None

class GoalUpdateSchema(BaseModel):
    title: Optional[str] = None
    desc: Optional[str] = None
    status: Optional[str] = None
    targetDate: Optional[str] = None

class GoalOut(BaseModel):
    id: str
    title: str
    desc: Optional[str] = ""
    status: str
    targetDate: Optional[str] = None
    ownerId: Optional[str] = None
    createdAt: Optional[str] = None
