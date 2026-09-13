"""Gemini embedding helpers. Vectors only — never persist CV files."""

from __future__ import annotations

import json
import urllib.error
import urllib.request

from app.config import get_settings

# text-embedding-004 was shut down; gemini-embedding-001 is its replacement.
# 768 dims (vs. the model's 3072 default) — Google's own guidance is ~0.26%
# quality loss for 75% less storage, and it keeps vector size in line with
# what this schema was already built around.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768


def embed_text(text: str) -> list[float] | None:
    """Return an embedding vector for text, or None if Gemini is unavailable."""
    settings = get_settings()
    if not settings.gemini_api_key:
        return None
    cleaned = (text or "").strip()
    if not cleaned:
        return None

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{EMBEDDING_MODEL}:embedContent?key={settings.gemini_api_key}"
    )
    payload = json.dumps(
        {
            "model": f"models/{EMBEDDING_MODEL}",
            "content": {"parts": [{"text": cleaned[:8000]}]},
            "taskType": "SEMANTIC_SIMILARITY",
            "outputDimensionality": EMBEDDING_DIMS,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        values = data.get("embedding", {}).get("values")
        if not values:
            return None
        return [float(v) for v in values]
    except (urllib.error.URLError, TimeoutError, KeyError, TypeError, ValueError):
        return None


def embed_skills(skill_ids: list[str]) -> list[float] | None:
    """Embed a skill set as a compact semantic vector."""
    if not skill_ids:
        return None
    return embed_text("Student skills: " + ", ".join(sorted(skill_ids)))
