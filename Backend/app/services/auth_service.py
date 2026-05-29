
from app.config import settings
from app.core.exceptions import ExternalServiceError, UnauthorizedError
from app.core.logging import logger
from app.core.supabase import supabase_admin


class AuthService:
    """Wraps Supabase Admin Auth API. No custom JWT minting — Supabase issues all tokens.
    Backend verifies tokens via SUPABASE_JWT_SECRET (HS256) in core/security.py.
    """

    async def send_otp(self, phone_number: str) -> None:
        """Send OTP via SMS (Twilio backend in Supabase Auth).
        Phone OTP = primary auth method. Universal for all user types.
        """
        try:
            supabase_admin.auth.sign_in_with_otp({"phone": phone_number})
            logger.info("auth.otp_sent", phone=phone_number[-4:])
        except Exception as exc:
            raise ExternalServiceError("Supabase Auth", f"OTP send failed: {exc}") from exc

    async def verify_otp(self, phone_number: str, token: str) -> dict:
        """Verify 6-digit OTP. Returns session dict with access_token + refresh_token."""
        try:
            response = supabase_admin.auth.verify_otp(
                {"phone": phone_number, "token": token, "type": "sms"}
            )
            if not response.session:
                raise UnauthorizedError("OTP verification failed — invalid or expired code")
            logger.info("auth.otp_verified", phone=phone_number[-4:])
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
                "user": response.user,
            }
        except UnauthorizedError:
            raise
        except Exception as exc:
            raise ExternalServiceError("Supabase Auth", f"OTP verify failed: {exc}") from exc

    async def send_custom_phone_otp(self, user_id, phone_number: str) -> None:
        """Generate 6-digit OTP, store in Redis, send via SMS (or WhatsApp fallback)."""
        import secrets

        from app.cache.phone_otp_cache import set_phone_otp

        otp = f"{secrets.randbelow(1_000_000):06d}"
        await set_phone_otp(user_id, phone_number, otp)
        message = f"Your CareCircle verification code is: {otp}\nValid for 10 minutes. Do not share this code."

        if settings.twilio_sms_from:
            # Plain SMS via Twilio
            from twilio.rest import Client
            client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
            client.messages.create(from_=settings.twilio_sms_from, to=phone_number, body=message)
        else:
            # Fallback: WhatsApp
            from app.worker.jobs._helpers import send_whatsapp_to_phone
            await send_whatsapp_to_phone(phone_number, message)

        logger.info("auth.custom_phone_otp_sent", phone=phone_number[-4:])

    async def verify_custom_phone_otp(self, user_id, phone_number: str, otp: str) -> None:
        """Verify OTP against Redis. Raises UnauthorizedError on mismatch or expiry."""
        from app.cache.phone_otp_cache import delete_phone_otp, get_phone_otp

        stored = await get_phone_otp(user_id)
        if not stored:
            raise UnauthorizedError("OTP expired or not found — request a new one")
        if stored.get("phone") != phone_number or stored.get("otp") != otp:
            raise UnauthorizedError("Invalid OTP")
        await delete_phone_otp(user_id)
        logger.info("auth.custom_phone_otp_verified", phone=phone_number[-4:])

    async def sign_in_google(self, id_token: str) -> dict:
        """Google OAuth sign-in. Secondary auth method — urban professionals."""
        try:
            response = supabase_admin.auth.sign_in_with_id_token(
                {"provider": "google", "token": id_token}
            )
            if not response.session:
                raise UnauthorizedError("Google sign-in failed")
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
                "user": response.user,
            }
        except UnauthorizedError:
            raise
        except Exception as exc:
            raise ExternalServiceError("Supabase Auth", f"Google sign-in failed: {exc}") from exc

    async def refresh_session(self, refresh_token: str) -> dict:
        """Refresh expired access token. Session expires after 30 days (health app — no frequent re-login)."""
        try:
            response = supabase_admin.auth.refresh_session(refresh_token)
            if not response.session:
                raise UnauthorizedError("Session refresh failed — refresh token expired")
            return {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_in": response.session.expires_in,
                "user": response.user,
            }
        except UnauthorizedError:
            raise
        except Exception as exc:
            raise ExternalServiceError("Supabase Auth", f"Session refresh failed: {exc}") from exc

    async def get_user_by_uid(self, uid: str):
        """Fetch Supabase auth.users row by UID using direct HTTP request to Admin API.
        Bypasses potential library issues with service role key propagation.
        """
        import httpx

        from app.config import settings

        url = f"{settings.supabase_url}/auth/v1/admin/users/{uid}"
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}"
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                if response.status_code != 200:
                    raise Exception(f"Status {response.status_code}: {response.text}")

                data = response.json()
                # Construct a simple object-like structure to match previous return type if possible,
                # or just return the dict. get_current_user expects an object with .user_metadata etc.
                from types import SimpleNamespace
                return SimpleNamespace(**data)
        except Exception as exc:
            raise ExternalServiceError("Supabase Auth", f"get_user failed: {exc}") from exc
