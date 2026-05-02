from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "CoralGuard AI Backend"
    env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"
    jwt_secret_key: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120
    database_url: str = "sqlite:///./coralguard.db"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "reef_knowledge"
    llm_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    model_path: str = "models/efficientnet_b3_coral_v1.keras"
    hdbscan_model_path: str = "models/dbscan_model.pkl"
    scaler_path: str = "models/scaler.pkl"
    alert_email_from: str = "alerts@coralguard.ai"
    alert_email_to: str = "authority@example.gov"
    alert_webhook_url: str = ""
    rate_limit_per_minute: int = 60
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
