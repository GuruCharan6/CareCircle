from typing import Any

import jwt as pyjwt
from jwt import PyJWKClient

from app.config import settings
from app.core.exceptions import UnauthorizedError

ALGORITHMS = ["HS256", "RS256", "ES256"]

# Global client for caching JWKS
jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

def verify_token(token: str) -> dict[str, Any]:
    """Verify Supabase-issued JWT. Return decoded claims."""
    try:
        header = pyjwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            key = settings.supabase_jwt_secret
        else:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            key = signing_key.key

        payload = pyjwt.decode(
            token,
            key,
            algorithms=ALGORITHMS,
            options={"verify_aud": False},
        )
        return payload
    except pyjwt.PyJWTError as exc:
        raise UnauthorizedError(f"Invalid token: {exc}") from exc


def extract_user_id(token: str) -> str:
    """Return auth.uid() (sub claim) from Supabase JWT."""
    claims = verify_token(token)
    sub = claims.get("sub")
    if not sub:
        raise UnauthorizedError("Token missing sub claim")
    return sub


def extract_claims(token: str) -> tuple[str, str, str | None]:
    """Return (user_id, role, email) from Supabase JWT."""
    claims = verify_token(token)
    user_id = claims.get("sub") or ""
    role = claims.get("role") or "authenticated"
    email = claims.get("email")
    if not user_id:
        raise UnauthorizedError("Token missing sub claim")
    return user_id, role, email
