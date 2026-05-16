import httpx

from app.core.supabase import supabase_admin
from app.config import settings

# All storage URLs are signed with expiry — never public permanent URLs.
# Health data must never be permanently accessible.

_UPLOAD_EXPIRY = 900    # 15 min — enough to upload, not long enough to leak
_VIEW_EXPIRY = 3600     # 1 hour — enough to view, regenerated on each access


def _extract_url(result: object, label: str, bucket: str, path: str) -> str:
    url: str | None = None
    if hasattr(result, "signed_url"):
        url = str(result.signed_url)  # type: ignore[union-attr]
    elif isinstance(result, dict):
        url = result.get("signedURL") or result.get("signedUrl") or result.get("signed_url")
    if not url:
        raise ValueError(f"Supabase Storage returned no {label} URL for {bucket}/{path}: {result}")
    return url


def create_signed_upload_url(bucket: str, path: str) -> str:
    """Generate Supabase Storage signed upload URL (PUT to this URL).
    Client uploads directly to Supabase Storage — backend never handles file bytes.
    Returns signed URL string.
    """
    result = supabase_admin.storage.from_(bucket).create_signed_upload_url(path)
    return _extract_url(result, "upload", bucket, path)


def create_signed_view_url(bucket: str, path: str, expires_in: int = _VIEW_EXPIRY, download: bool | str = False) -> str:
    """Generate Supabase Storage signed read URL.
    Regenerated on every access — never stored permanently.
    Returns signed URL string.
    """
    options: dict = {}
    if download:
        options["download"] = download

    result = supabase_admin.storage.from_(bucket).create_signed_url(path, expires_in, options)  # type: ignore[arg-type]
    return _extract_url(result, "view", bucket, path)


def delete_file(bucket: str, path: str) -> None:
    """Delete file from Supabase Storage. Used when document rejected."""
    supabase_admin.storage.from_(bucket).remove([path])


def storage_upload(bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> None:
    """Upload bytes to Supabase Storage using direct HTTP with service role JWT.

    The supabase-py storage SDK does not reliably forward the service role token,
    causing RLS violations even for admin uploads. Direct httpx call bypasses this.
    """
    url = f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    response = httpx.post(url, content=data, headers=headers)
    response.raise_for_status()
