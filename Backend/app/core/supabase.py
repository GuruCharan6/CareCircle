from app.config import settings
from supabase import Client, create_client

supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)

supabase_anon: Client = create_client(
    settings.supabase_url,
    settings.supabase_anon_key,
)
