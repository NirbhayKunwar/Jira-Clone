import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Jira Clone API (FastAPI)"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment
    ENVIRONMENT: str = os.getenv("NODE_ENV", "development")
    PORT: int = int(os.getenv("PORT", "5000"))
    
    # MongoDB Atlas
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mongodb+srv://kunwarnirbhay48:oX4XnK5j1oHwQ5v6@cluster0.b9gvh.mongodb.net/Jira-Clone?retryWrites=true&w=majority"
    )
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "Jira-Clone")
    
    # JWT Secrets
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-jwt-key-jira-clone-production-2026")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "super-secret-jwt-refresh-key-jira-clone-2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv(
        "GOOGLE_CLIENT_ID", 
        "304604649485-qd4b8f7asabkc2l9n2h3rmd5lfdlbv23.apps.googleusercontent.com"
    )
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
