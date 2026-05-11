from functools import lru_cache

from app.providers.whatsapp.base import WhatsAppProvider


@lru_cache(maxsize=1)
def get_whatsapp_provider() -> WhatsAppProvider:
    """Return configured WhatsApp provider. WHATSAPP_PROVIDER env var selects impl.
    Defaults to 'twilio' (dev/demo). Set to 'meta' for production when meta.py added.
    """
    import os
    provider_name = os.getenv("WHATSAPP_PROVIDER", "twilio").lower()

    if provider_name == "twilio":
        from app.providers.whatsapp.twilio import TwilioProvider
        return TwilioProvider()

    raise ValueError(f"Unknown WHATSAPP_PROVIDER: {provider_name!r}. Supported: 'twilio'")
