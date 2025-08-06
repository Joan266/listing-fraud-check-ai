from pydantic_settings import BaseSettings
from typing import Optional, Literal

class Settings(BaseSettings):
    # Application Settings
    PROJECT_NAME: str = "FraudCheck.ai MVP"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: Literal["development", "production"] = "development"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    
    # Google Services
    GOOGLE_API_KEY: str
    GOOGLE_GEMINI_API_KEY: str 
    GOOGLE_SEARCH_ENGINE_ID: str
    
    # Security
    RISK_SCORE_THRESHOLD: int = 70
    API_RATE_LIMIT: str = "100/minute"
    
    # CORS
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

    @property
    def cors_origins(self):
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]

settings = Settings()