from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class SignUpSchema(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    invitedBy: Optional[str] = None

class SignInSchema(BaseModel):
    email: EmailStr
    password: str

class GoogleSignInSchema(BaseModel):
    credential: str

class SendOtpSchema(BaseModel):
    email: EmailStr

class ChangePasswordSchema(BaseModel):
    email: EmailStr
    otp: str
    newPassword: str = Field(..., min_length=6)
