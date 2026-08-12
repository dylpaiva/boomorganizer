"""Configuration is read from deployment secrets, never source control."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/pyroledger"
    supabase_jwt_issuer: str | None = None
    supabase_jwks_url: str | None = None
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_prefix="PYROLEDGER_", env_file=".env")


settings = Settings()
