from app.core.supabase import supabase_admin

# All storage URLs are signed with expiry — never public permanent URLs.
# Health data must never be permanently accessible.

_UPLOAD_EXPIRY = 900    # 15 min — enough to upload, not long enough to leak
_VIEW_EXPIRY = 3600     # 1 hour — enough to view, regenerated on each access


def create_signed_upload_url(bucket: str, path: str) -> str:
    """Generate Supabase Storage signed upload URL (PUT to this URL).
    Client uploads directly to Supabase Storage — backend never handles file bytes.
    Returns signed URL string.
    """
    result = supabase_admin.storage.from_(bucket).create_signed_upload_url(path)
    # result is dict with 'signedUrl' key
    url = result.get("signedUrl") or result.get("signed_url")
    if not url:
        raise ValueError(f"Supabase Storage returned no upload URL for {bucket}/{path}: {result}")
    return url


def create_signed_view_url(bucket: str, path: str, expires_in: int = _VIEW_EXPIRY, download: bool | str = False) -> str:
    """Generate Supabase Storage signed read URL.
    Regenerated on every access — never stored permanently.
    Returns signed URL string.
    """
    options = {}
    if download:
        options["download"] = download
        
    result = supabase_admin.storage.from_(bucket).create_signed_url(path, expires_in, options)
    url = result.get("signedUrl") or result.get("signed_url")
    if not url:
        raise ValueError(f"Supabase Storage returned no view URL for {bucket}/{path}: {result}")
    return url


def delete_file(bucket: str, path: str) -> None:
    """Delete file from Supabase Storage. Used when document rejected."""
    supabase_admin.storage.from_(bucket).remove([path])
