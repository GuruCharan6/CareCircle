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
    gemini_model: str = "gemini-2.0-flash"
    firebase_credentials_path: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"
    twilio_sms_from: str = ""  # E.164 SMS number e.g. +1234567890. If empty, OTP sends via WhatsApp.
    sarvam_api_key: str = ""
    sarvam_api_url: str = "https://api.sarvam.ai/speech-to-text"

    # URLs
    frontend_base_url: str = "https://carecircle.app"   # override in dev: http://localhost:3000
    backend_base_url: str = "https://api.carecircle.app"  # override in dev: http://localhost:8000
    internal_base_url: str = "https://carecircle-84st.onrender.com"     # used for internal health/task triggers
    internal_secret: str = ""


settings = Settings()
