from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Prefer Supabase Postgres URI (Settings → Database → Connection string).
    # Local Docker default kept for offline job seeding only.
    database_url: str = "sqlite:///./unipro.db"
    # Must be the Supabase project JWT Secret (Settings → API → JWT Secret).
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_audience: str = "authenticated"
    cors_origins: str = "http://localhost:3000"
    gemini_api_key: str | None = None
    # Disable when DATABASE_URL points at Supabase (users FK → auth.users).
    seed_on_startup: bool = True
    # Disable create_all against Supabase (schema already managed via SQL migrations).
    init_db_on_startup: bool = True
    supabase_url: str | None = None
    supabase_anon_key: str | None = None

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
