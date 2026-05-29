from typing import Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from app.api.deps import DBConn, get_current_user
from app.core.logging import get_logger
from app.models.user import User
from app.providers.whatsapp.factory import get_whatsapp_provider
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    AuthResponse,
    GoogleAuthRequest,
    OTPSendRequest,
    OTPSendResponse,
    OTPVerifyRequest,
    PhoneSendOtpRequest,
    PhoneVerifyOtpRequest,
    RefreshTokenRequest,
    UpdateProfileRequest,
    UpdateProfileResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

# No custom JWT minting. Supabase Auth issues all tokens.
# Backend verifies via SUPABASE_JWT_SECRET (HS256) in core/security.py.
# Session expires 30 days (health app — don't force frequent re-login).

_COOKIE_MAX_AGE = 30 * 24 * 3600  # 30 days — matches Supabase session lifetime


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    from app.config import settings
    is_prod = not settings.debug
    response.set_cookie(
        key="cc_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="none" if is_prod else "lax",
        max_age=_COOKIE_MAX_AGE,
        path="/api/v1/auth",
    )


def _build_user_response(supabase_user) -> UserResponse:
    return UserResponse(
        id=str(supabase_user.id),
        phone_number=getattr(supabase_user, "phone", None),
        email=getattr(supabase_user, "email", None),
        auth_provider=supabase_user.app_metadata.get("provider", "phone"),
        name=supabase_user.user_metadata.get("name", ""),
        role=supabase_user.user_metadata.get("role", "family_caregiver"),
        preferences={},
    )


@router.post("/otp/send", response_model=OTPSendResponse)
async def send_otp(body: OTPSendRequest) -> OTPSendResponse:
    """Send OTP via SMS. Phone OTP = primary auth — universal for all user types."""
    svc = AuthService()
    await svc.send_otp(body.phone_number)
    return OTPSendResponse(
        message="OTP sent",
        phone_number=body.phone_number,
    )


@router.post("/otp/verify", response_model=AuthResponse)
async def verify_otp(body: OTPVerifyRequest, conn: DBConn, response: Response) -> AuthResponse:
    """Verify OTP → returns access_token. Refresh token set as httpOnly cookie."""
    svc = AuthService()
    session_data = await svc.verify_otp(body.phone_number, body.token)
    _set_refresh_cookie(response, session_data["refresh_token"])
    return AuthResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        expires_in=session_data["expires_in"] or 3600,
        user=_build_user_response(session_data["user"]),
    )


@router.post("/google", response_model=AuthResponse)
async def sign_in_google(body: GoogleAuthRequest, response: Response) -> AuthResponse:
    """Google OAuth sign-in. Secondary option — some urban professionals prefer it."""
    svc = AuthService()
    session_data = await svc.sign_in_google(body.id_token)
    _set_refresh_cookie(response, session_data["refresh_token"])
    return AuthResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        expires_in=session_data["expires_in"] or 3600,
        user=_build_user_response(session_data["user"]),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(
    response: Response,
    body: RefreshTokenRequest | None = None,
    cc_refresh_token: str | None = Cookie(default=None),
) -> AuthResponse:
    """Refresh expired access token. Reads from httpOnly cookie (preferred) or request body."""
    token = cc_refresh_token or (body.refresh_token if body else None)
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token provided")
    svc = AuthService()
    session_data = await svc.refresh_session(token)
    _set_refresh_cookie(response, session_data["refresh_token"])
    return AuthResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        expires_in=session_data["expires_in"] or 3600,
        user=_build_user_response(session_data["user"]),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    """Return current authenticated user profile."""
    return UserResponse(
        id=str(current_user.id),
        phone_number=current_user.phone_number,
        email=current_user.email,
        auth_provider=current_user.auth_provider,
        name=current_user.name,
        role=current_user.role,
        preferences=current_user.preferences or {},
    )


@router.post("/me/phone/send-otp", response_model=OTPSendResponse)
async def send_phone_verification_otp(
    body: PhoneSendOtpRequest,
    current_user: User = Depends(get_current_user),
) -> OTPSendResponse:
    """Generate OTP, store in Redis, send via WhatsApp to phone number."""
    svc = AuthService()
    await svc.send_custom_phone_otp(current_user.id, body.phone_number)
    return OTPSendResponse(message="OTP sent via WhatsApp", phone_number=body.phone_number)


@router.post("/me/phone/verify-otp", response_model=UpdateProfileResponse)
async def verify_phone_and_update(
    body: PhoneVerifyOtpRequest,
    conn: DBConn,
    current_user: User = Depends(get_current_user),
) -> UpdateProfileResponse:
    """Verify OTP from Redis, save phone number to profile. Enables WhatsApp digest."""
    svc = AuthService()
    await svc.verify_custom_phone_otp(current_user.id, body.phone_number, body.otp)
    repo = UserRepository(conn)
    updated = await repo.update_phone_number(current_user.id, body.phone_number)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UpdateProfileResponse(
        id=str(updated.id),
        name=updated.name,
        phone_number=updated.phone_number,
        email=updated.email,
        auth_provider=updated.auth_provider,
        role=updated.role,
        preferences=updated.preferences,
    )


@router.delete("/me/phone", response_model=UpdateProfileResponse)
async def remove_phone(
    conn: DBConn,
    current_user: User = Depends(get_current_user),
) -> UpdateProfileResponse:
    """Remove phone number from profile. WhatsApp digest will stop until a new number is added."""
    repo = UserRepository(conn)
    updated = await repo.remove_phone_number(current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UpdateProfileResponse(
        id=str(updated.id),
        name=updated.name,
        phone_number=updated.phone_number,
        email=updated.email,
        auth_provider=updated.auth_provider,
        role=updated.role,
        preferences=updated.preferences,
    )


@router.post("/me/whatsapp/verify")
async def verify_whatsapp_connection(
    conn: DBConn,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Verify WhatsApp sandbox connection by attempting to send a test message.
    Twilio returns an error (63007) if the user hasn't joined the sandbox.
    On success, marks whatsapp_connected=true in DB.
    """
    if not current_user.phone_number:
        return {"connected": False, "error": "No phone number on file"}

    provider = get_whatsapp_provider()
    try:
        await provider.send_text(
            current_user.phone_number,
            "✅ CareCircle WhatsApp connected! You'll receive your daily health digests here.",
        )
        repo = UserRepository(conn)
        prefs: dict[str, Any] = dict(current_user.preferences or {})
        prefs["whatsapp_connected"] = True
        prefs["whatsapp_number"] = current_user.phone_number
        prefs.setdefault("whatsapp_digest", True)
        await repo.update_preferences(current_user.id, prefs)
        logger.info("whatsapp.verified_via_send", user_id=str(current_user.id))
        return {"connected": True}
    except Exception as exc:
        logger.warning("whatsapp.verify_failed", user_id=str(current_user.id), error=str(exc))
        return {"connected": False, "error": str(exc)}


@router.patch("/me", response_model=UpdateProfileResponse)
async def update_me(
    body: UpdateProfileRequest,
    conn: DBConn,
    current_user: User = Depends(get_current_user),
) -> UpdateProfileResponse:
    """Update user profile — name and/or notification preferences."""
    repo = UserRepository(conn)
    updated = await repo.update_profile(
        current_user.id,
        name=body.name,
        preferences=body.preferences,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return UpdateProfileResponse(
        id=str(updated.id),
        name=updated.name,
        phone_number=updated.phone_number,
        email=updated.email,
        auth_provider=updated.auth_provider,
        role=updated.role,
        preferences=updated.preferences,
    )
