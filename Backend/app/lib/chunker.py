# Text chunker: 500-token chunks, 50-token overlap.
# Token estimate: ~4 chars/token (covers English + Hinglish output from Saravam).
# Boundary-aware: tries to split at sentence endings, not mid-word.

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
_CHARS_PER_TOKEN = 4


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    overlap: int = CHUNK_OVERLAP,
) -> list[str]:
    """Split text into overlapping chunks. Returns list of non-empty chunk strings."""
    text = text.strip()
    if not text:
        return []

    char_size = chunk_size * _CHARS_PER_TOKEN
    char_overlap = overlap * _CHARS_PER_TOKEN

    chunks: list[str] = []
    start = 0
    length = len(text)

    while start < length:
        end = min(start + char_size, length)

        # Try to end at a natural boundary within last 10% of the chunk window.
        if end < length:
            search_from = end - char_size // 10
            for sep in ["\n\n", ".\n", ". ", "\n"]:
                pos = text.rfind(sep, search_from, end)
                if pos != -1:
                    end = pos + len(sep)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        start = end - char_overlap
        if start <= 0 or start >= length or end >= length:
            break

    return chunks


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // _CHARS_PER_TOKEN)
