from typing import Any
from pydantic import BaseModel, field_validator


class OTPSendRequest(BaseModel):
    phone_number: str  # E.164 format: +91XXXXXXXXXX

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.startswith("+"):
            raise ValueError("phone_number must be E.164 format (e.g. +91XXXXXXXXXX)")
        return v


class OTPVerifyRequest(BaseModel):
    phone_number: str
    token: str  # 6-digit OTP from Supabase Auth


class GoogleAuthRequest(BaseModel):
    id_token: str  # Google ID token from client


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    phone_number: str | None = None
    email: str | None = None
    auth_provider: str
    name: str
    role: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserResponse


class OTPSendResponse(BaseModel):
    message: str
    phone_number: str


class PhoneSendOtpRequest(BaseModel):
    phone_number: str

    @field_validator("phone_number")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.startswith("+"):
            raise ValueError("phone_number must be E.164 format (e.g. +91XXXXXXXXXX)")
        return v


class PhoneVerifyOtpRequest(BaseModel):
    phone_number: str
    otp: str


class UpdateProfileRequest(BaseModel):
    name: str | None = None
    preferences: dict[str, Any] | None = None


class UpdateProfileResponse(BaseModel):
    id: str
    name: str
    phone_number: str | None = None
    email: str | None = None
    auth_provider: str
    role: str
    preferences: dict[str, Any] = {}
