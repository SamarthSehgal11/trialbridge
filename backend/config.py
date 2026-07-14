import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///trialbridge.db"
    cache_ttl: int = 60
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:80", "*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
