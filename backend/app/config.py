from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "development"
    database_url: str = "sqlite:///./data/proerply.db"
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    session_days: int = 7
    seed_demo_users: bool = False
    seed_password: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "learning@proerply.example"
    smtp_starttls: bool = True
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    ice_servers_json: str = "[]"
    turn_secret: str = ""
    turn_url: str = ""

    @property
    def origins(self):
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def secure(self):
        return self.cookie_secure or self.app_env == "production"


settings = Settings()
if settings.app_env == "production" and settings.seed_demo_users:
    raise RuntimeError("SEED_DEMO_USERS must be false in production.")
if settings.app_env == "production" and not settings.frontend_url.startswith(
    "https://"
):
    raise RuntimeError("Production FRONTEND_URL must use HTTPS.")
if settings.cookie_samesite not in ("lax", "strict", "none"):
    raise RuntimeError("COOKIE_SAMESITE must be lax, strict, or none.")
if settings.cookie_samesite == "none" and not settings.secure:
    raise RuntimeError("SameSite=None requires a secure HTTPS cookie.")
