# app/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "FraudCheck.ai MVP"
    API_V1_STR: str = "/api/v1"

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int

    # Google
    GOOGLE_API_KEY: str

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()