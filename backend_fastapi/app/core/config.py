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
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # MongoDB Atlas / Local Connection
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mongodb://localhost:27017/jira_clone")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "jira_clone")
    
    # JWT Secrets
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")
    JWT_REFRESH_SECRET: str = os.getenv("JWT_REFRESH_SECRET", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000"
        ).split(",") if origin.strip()
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def model_post_init(self, __context):
        # In non-testing environments, fail startup safely if JWT_SECRET is missing
        if self.ENVIRONMENT != "test" and not self.JWT_SECRET:
            raise ValueError("FATAL: JWT_SECRET environment variable is not set. Application cannot start safely.")

settings = Settings()
