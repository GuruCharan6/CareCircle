import json

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "CareCircle"
    environment: str = "development"
    debug: bool = False

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str
    supabase_db_url: str  # asyncpg transaction pooler URL (port 6543)
    supabase_storage_bucket_documents: str = "source-documents"
    supabase_storage_bucket_crisis_pdfs: str = "crisis-packet-pdfs"
    supabase_storage_bucket_med_pdfs: str = "medication-list-pdfs"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Celery
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # External providers
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    firebase_credentials_path: str = ""   # file path (local dev)
    firebase_credentials_json: str = ""   # full JSON string (Render / cloud env)
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_sms_from: str = ""  # E.164 SMS number e.g. +1234567890. If empty, OTP sends via WhatsApp.
    sarvam_api_key: str = ""
    sarvam_api_url: str = "https://api.sarvam.ai/speech-to-text"

    # URLs
    frontend_base_url: str = "https://carecircle.app"   # override in dev: http://localhost:3000
    backend_base_url: str = "https://api.carecircle.app"  # override in dev: http://localhost:8000
    internal_base_url: str = "http://localhost:10000"  # Render internal port; override in dev: http://localhost:8000
    internal_secret: str = ""

    # CORS — stored as raw string to avoid pydantic-settings list parsing issues.
    # Accepts JSON array OR comma-separated. Call get_cors_origins() to get list.
    # Render env: CORS_ORIGINS='["https://domain.com","http://localhost:3000"]'
    # Local .env: CORS_ORIGINS=http://localhost:3000,http://localhost:5173
    cors_origins: str = '["https://care-circle-three.vercel.app","http://localhost:3000"]'

    def get_cors_origins(self) -> list[str]:
        """Parse cors_origins string → list. Handles JSON array or comma-separated."""
        v = self.cors_origins.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]

    # Sentry error tracking
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1   # 10% of requests traced in prod

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        """Fail fast on boot if critical secrets missing in production."""
        if self.environment == "production":
            required = {
                "GEMINI_API_KEY": self.gemini_api_key,
                "FIREBASE_CREDENTIALS_JSON": self.firebase_credentials_json,
                "TWILIO_ACCOUNT_SID": self.twilio_account_sid,
                "TWILIO_AUTH_TOKEN": self.twilio_auth_token,
                "INTERNAL_SECRET": self.internal_secret,
                "SENTRY_DSN": self.sentry_dsn,
            }
            missing = [k for k, v in required.items() if not v]
            if missing:
                raise ValueError(
                    f"Missing required production secrets: {missing}. "
                    "Set these as environment variables on Render before deploying."
                )
        return self


settings = Settings()
