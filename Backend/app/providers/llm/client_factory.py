"""
Shared factory for google-genai clients.

When VERTEX_PROJECT is set in environment, uses Vertex AI (no geographic
restriction — works from Render US servers).
Falls back to AI Studio API key for local development.
"""
from __future__ import annotations

import json
import os
import tempfile
from typing import Optional

from google import genai
from google.genai import types


def _setup_vertex_credentials(credentials_json: str) -> None:
    """Write credentials JSON to a temp file and point GOOGLE_APPLICATION_CREDENTIALS at it.

    google-genai SDK reads this env var automatically when vertexai=True.
    We write to a tempfile because Render env vars are strings, not files.
    """
    if not credentials_json.strip():
        return

    # Validate it's parseable JSON before writing
    try:
        json.loads(credentials_json)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"GOOGLE_CREDENTIALS_JSON is not valid JSON: {e}. "
            "Paste the entire service account key file contents."
        ) from e

    # Only write if not already set (avoid re-writing on every import)
    if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        tmp = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            delete=False,
            prefix="gcp_sa_",
        )
        tmp.write(credentials_json)
        tmp.flush()
        tmp.close()
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp.name


def build_genai_client(
    http_options: Optional[types.HttpOptions] = None,
) -> genai.Client:
    """Return a configured genai.Client.

    Uses Vertex AI when VERTEX_PROJECT env var is set (production on Render).
    Uses AI Studio API key otherwise (local development).
    """
    from app.config import settings  # lazy import to avoid circular

    if settings.vertex_project:
        # Set up credentials file from env var JSON string
        _setup_vertex_credentials(settings.google_credentials_json)

        kwargs: dict = dict(
            vertexai=True,
            project=settings.vertex_project,
            location=settings.vertex_location,
        )
        if http_options:
            kwargs["http_options"] = http_options
        return genai.Client(**kwargs)

    # Local dev — AI Studio key
    kwargs = dict(api_key=settings.gemini_api_key)
    if http_options:
        kwargs["http_options"] = http_options
    return genai.Client(**kwargs)
