from functools import lru_cache

from app.providers.llm.base import LLMProvider


@lru_cache(maxsize=1)
def get_llm_provider() -> LLMProvider:
    """Return configured LLM provider. LLM_PROVIDER env var selects impl.
    Defaults to 'gemini'. Set to 'claude' to use ClaudeProvider.
    Both implement identical LLMProvider interface — fully swappable.
    """
    import os
    provider_name = os.getenv("LLM_PROVIDER", "gemini").lower()

    if provider_name == "gemini":
        from app.providers.llm.gemini import GeminiProvider
        return GeminiProvider()

    if provider_name == "claude":
        from app.providers.llm.claude import ClaudeProvider
        return ClaudeProvider()

    raise ValueError(f"Unknown LLM_PROVIDER: {provider_name!r}. Supported: 'gemini', 'claude'")


__all__ = ["LLMProvider", "get_llm_provider"]
