from fastapi import APIRouter, Depends
from uuid import UUID

from fastapi import HTTPException
from app.api.deps import DBConn, get_current_user
from app.models.user import User
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

router = APIRouter(prefix="/auth", tags=["auth"])

# No custom JWT minting. Supabase Auth issues all tokens.
# Backend verifies via SUPABASE_JWT_SECRET (HS256) in core/security.py.
# Session expires 30 days (health app — don't force frequent re-login).


def _build_user_response(supabase_user) -> UserResponse:
    return UserResponse(
        id=str(supabase_user.id),
        phone_number=getattr(supabase_user, "phone", None),
        email=getattr(supabase_user, "email", None),
        auth_provider=supabase_user.app_metadata.get("provider", "phone"),
        name=supabase_user.user_metadata.get("name", ""),
        role=supabase_user.user_metadata.get("role", "family_caregiver"),
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
async def verify_otp(body: OTPVerifyRequest, conn: DBConn) -> AuthResponse:
    """Verify OTP → returns access_token + refresh_token.
    Supabase trigger auto-creates public.users row on first login.
    """
    svc = AuthService()
    session_data = await svc.verify_otp(body.phone_number, body.token)

    return AuthResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        expires_in=session_data["expires_in"] or 3600,
        user=_build_user_response(session_data["user"]),
    )


@router.post("/google", response_model=AuthResponse)
async def sign_in_google(body: GoogleAuthRequest) -> AuthResponse:
    """Google OAuth sign-in. Secondary option — some urban professionals prefer it."""
    svc = AuthService()
    session_data = await svc.sign_in_google(body.id_token)

    return AuthResponse(
        access_token=session_data["access_token"],
        refresh_token=session_data["refresh_token"],
        expires_in=session_data["expires_in"] or 3600,
        user=_build_user_response(session_data["user"]),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshTokenRequest) -> AuthResponse:
    """Refresh expired access token. Refresh token stored in Keychain/Keystore — never localStorage."""
    svc = AuthService()
    session_data = await svc.refresh_session(body.refresh_token)

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
