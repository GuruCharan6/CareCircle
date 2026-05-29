from datetime import UTC, datetime, timedelta
from uuid import UUID

from jose import jwt

from app.config import settings

# 15-min pre-auth JWT embedded in WhatsApp digest CTA button URL.
# URL format: carecircle.app/upload?token=<jwt>
# Meera taps → app opens already authenticated. No re-auth friction.
# Signed with SUPABASE_JWT_SECRET so backend can verify with same key.

_ALGORITHM = "HS256"
_EXPIRY_MINUTES = 15


def create_upload_jwt(user_id: UUID, patient_id: UUID) -> str:
    """Create 15-min pre-auth JWT for WhatsApp CTA upload flow.

    Claims:
      sub: user_id (matches Supabase auth.uid() convention)
      patient_id: pre-selected patient for the upload
      purpose: 'whatsapp_upload' — restricts token to upload flow only
      exp: 15 minutes from now
    """
    now = datetime.now(tz=UTC)
    payload = {
        "sub": str(user_id),
        "patient_id": str(patient_id),
        "purpose": "whatsapp_upload",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=_EXPIRY_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm=_ALGORITHM)


def verify_upload_jwt(token: str) -> dict:
    """Verify upload JWT. Returns decoded claims.
    Raises jose.JWTError if invalid/expired.
    Raises ValueError if purpose claim missing (wrong token type).
    """
    from jose import JWTError

    from app.core.exceptions import UnauthorizedError

    try:
        claims = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[_ALGORITHM],
            options={"verify_aud": False},
        )
    except JWTError as exc:
        raise UnauthorizedError(f"Invalid upload token: {exc}") from exc

    if claims.get("purpose") != "whatsapp_upload":
        raise UnauthorizedError("Token not valid for upload flow")

    return claims
