from typing import Optional
from pydantic import BaseModel

class TeamCreateSchema(BaseModel):
    name: str
    description: Optional[str] = ""

class TeamUpdateSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class TeamOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    ownerId: Optional[str] = None
    createdAt: Optional[str] = None
