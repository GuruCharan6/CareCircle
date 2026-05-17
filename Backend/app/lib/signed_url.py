import httpx

from app.config import settings
from app.core.logging import logger

# All storage URLs are signed with expiry — never public permanent URLs.
# Health data must never be permanently accessible.

_UPLOAD_EXPIRY = 900    # 15 min — enough to upload, not long enough to leak
_VIEW_EXPIRY = 3600     # 1 hour — enough to view, regenerated on each access

_STORAGE_BASE = f"{settings.supabase_url}/storage/v1"


def create_signed_upload_url(bucket: str, path: str) -> str:
    """Generate Supabase Storage signed upload URL (PUT to this URL).
    Client uploads directly to Supabase Storage — backend never handles file bytes.
    Returns signed URL string.

    Uses direct httpx (not supabase-py SDK) — SDK does not reliably forward
    the service role token, causing RLS violations on storage operations.
    """
    api_url = f"{_STORAGE_BASE}/object/upload/sign/{bucket}/{path}"
    headers = {"Authorization": f"Bearer {settings.supabase_service_role_key}"}
    response = httpx.post(api_url, headers=headers)
    if not response.is_success:
        logger.error("storage.signed_upload_url_failed", bucket=bucket, path=path,
                     status=response.status_code, body=response.text)
        response.raise_for_status()
    data = response.json()
    logger.info("storage.signed_upload_url_raw_response", data=data)
    raw = data.get("url") or data.get("signedURL") or data.get("signedUrl")
    if not raw:
        raise ValueError(f"Supabase Storage returned no upload URL for {bucket}/{path}: {data}")
    # SDK prepends storage base URL — do the same for raw API responses
    signed_url = f"{_STORAGE_BASE}{raw}" if raw.startswith("/") else raw
    logger.info("storage.signed_upload_url_generated", bucket=bucket, signed_url=signed_url)
    return signed_url


def create_signed_view_url(bucket: str, path: str, expires_in: int = _VIEW_EXPIRY, download: bool | str = False) -> str:
    """Generate Supabase Storage signed read URL.
    Regenerated on every access — never stored permanently.
    Returns signed URL string.
    """
    params: dict = {"expiresIn": expires_in}
    if download:
        params["download"] = download if isinstance(download, str) else ""

    api_url = f"{_STORAGE_BASE}/object/sign/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    response = httpx.post(api_url, json=params, headers=headers)
    if not response.is_success:
        logger.error("storage.signed_view_url_failed", bucket=bucket, path=path,
                     status=response.status_code, body=response.text)
        response.raise_for_status()
    data = response.json()
    logger.info("storage.signed_view_url_raw_response", data=data)
    raw = data.get("signedURL") or data.get("signedUrl") or data.get("signed_url") or data.get("url")
    if not raw:
        raise ValueError(f"Supabase Storage returned no view URL for {bucket}/{path}: {data}")
    # SDK prepends storage base URL — do the same for raw API responses
    signed_url = f"{_STORAGE_BASE}{raw}" if raw.startswith("/") else raw
    logger.info("storage.signed_view_url_generated", bucket=bucket, path=path, signed_url=signed_url)
    return signed_url


def delete_file(bucket: str, path: str) -> None:
    """Delete file from Supabase Storage. Used when document rejected."""
    api_url = f"{_STORAGE_BASE}/object/{bucket}/{path}"
    headers = {"Authorization": f"Bearer {settings.supabase_service_role_key}"}
    httpx.delete(api_url, headers=headers)


def storage_upload(bucket: str, path: str, data: bytes, content_type: str = "application/pdf") -> None:
    """Upload bytes to Supabase Storage using direct HTTP with service role JWT.

    The supabase-py storage SDK does not reliably forward the service role token,
    causing RLS violations even for admin uploads. Direct httpx call bypasses this.
    """
    api_url = f"{_STORAGE_BASE}/object/{bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    response = httpx.post(api_url, content=data, headers=headers)
    response.raise_for_status()
