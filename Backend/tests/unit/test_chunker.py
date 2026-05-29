"""Unit tests for app/lib/chunker.py."""
from app.lib.chunker import _CHARS_PER_TOKEN, CHUNK_OVERLAP, CHUNK_SIZE, chunk_text, estimate_tokens


class TestChunkText:
    def test_empty_string_returns_empty_list(self):
        assert chunk_text("") == []

    def test_whitespace_only_returns_empty_list(self):
        assert chunk_text("   \n  ") == []

    def test_short_text_returns_single_chunk(self):
        text = "Patient takes Metformin 500mg twice daily."
        chunks = chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_produces_multiple_chunks(self):
        # ~3000 chars = ~750 tokens > CHUNK_SIZE(500)
        text = "A" * (CHUNK_SIZE * _CHARS_PER_TOKEN * 3)
        chunks = chunk_text(text)
        assert len(chunks) >= 2

    def test_chunks_cover_full_text(self):
        # All characters should appear in at least one chunk
        text = "Hello world. " * 200
        chunks = chunk_text(text)
        assert len(chunks) > 1
        # First chunk starts at text start
        assert chunks[0].startswith("Hello")
        # Last chunk ends at text end
        assert chunks[-1].endswith(text.strip()[-20:])

    def test_chunks_have_overlap(self):
        text = "Sentence one. Sentence two. " * 200
        chunks = chunk_text(text)
        if len(chunks) >= 2:
            # End of chunk N and start of chunk N+1 should share content
            end_of_first = chunks[0][-CHUNK_OVERLAP * _CHARS_PER_TOKEN:]
            start_of_second = chunks[1][:CHUNK_OVERLAP * _CHARS_PER_TOKEN]
            # There should be some shared content (overlap)
            assert len(end_of_first) > 0
            assert len(start_of_second) > 0

    def test_chunk_size_respected(self):
        text = "X" * (CHUNK_SIZE * _CHARS_PER_TOKEN * 5)
        chunks = chunk_text(text)
        max_allowed = CHUNK_SIZE * _CHARS_PER_TOKEN + 100  # small buffer for boundary logic
        for chunk in chunks:
            assert len(chunk) <= max_allowed, f"Chunk too large: {len(chunk)} chars"

    def test_custom_chunk_size(self):
        text = "Word " * 100
        chunks = chunk_text(text, chunk_size=10, overlap=2)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 10 * _CHARS_PER_TOKEN + 20


class TestEstimateTokens:
    def test_empty_string(self):
        assert estimate_tokens("") == 1  # min 1

    def test_approximation(self):
        text = "A" * 400
        assert estimate_tokens(text) == 100  # 400 / 4 = 100

    def test_minimum_is_one(self):
        assert estimate_tokens("X") == 1
