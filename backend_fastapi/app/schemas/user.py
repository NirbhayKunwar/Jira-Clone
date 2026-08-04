from typing import Optional
from pydantic import BaseModel, EmailStr

class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    username: Optional[str] = None
    role: Optional[str] = "Full Stack Engineer"
    dept: Optional[str] = "Core Engineering"
    location: Optional[str] = ""
    githubUrl: Optional[str] = ""
    linkedinUrl: Optional[str] = ""
    websiteUrl: Optional[str] = ""
    otherLinks: Optional[str] = ""
    avatarUrl: Optional[str] = None
    authProvider: Optional[str] = "LOCAL"
    rbacRole: Optional[str] = "MEMBER"
    hasConfiguredWorkspace: Optional[bool] = False
    teamOwnerId: Optional[str] = None

class UpdateProfileSchema(BaseModel):
    name: str
    role: Optional[str] = None
    dept: Optional[str] = None
    location: Optional[str] = None
    githubUrl: Optional[str] = None
    linkedinUrl: Optional[str] = None
    websiteUrl: Optional[str] = None
    otherLinks: Optional[str] = None
    hasConfiguredWorkspace: Optional[bool] = None

class AddTeamMemberSchema(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "Full Stack Engineer"
    dept: Optional[str] = "Core Engineering"
    location: Optional[str] = ""
