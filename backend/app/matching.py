"""
Matching KPIs for UniPro SmartMatch.

HSCR (Hard Skill Coverage Ratio)
    |required ∩ candidate| / |required|
    Returns 1.0 when the internship has no required skills.

SGI (Skill Gap Index)
    1 - HSCR

SSSA (Semantic Skill Set Alignment)
    Prefer cosine similarity of stored embeddings (student.skills_embedding vs
    internship.required_skills_embedding).

    Fallback when either embedding is missing:
    1. Build fixed-dim bag-of-skills vectors via deterministic hashing of skill ids
       into EMBED_DIM bins, then cosine similarity; OR
    2. If both skill sets are empty, return 0.0.
    Documented Jaccard fallback: if hashing vectors are both zero (no skills),
    use Jaccard(|A∩B|/|A∪B|) on the skill id sets instead (0 when both empty).
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass


EMBED_DIM = 64


def skill_slug(name: str) -> str:
    """Normalize a display tag/name into a taxonomy skill_id."""
    s = name.strip().lower()
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "-", ".", "/", "+"):
            out.append("")
    return "".join(out) or "skill"


def compute_hscr(required: set[str], candidate: set[str]) -> float:
    if not required:
        return 1.0
    return len(required & candidate) / len(required)


def compute_sgi(hscr: float) -> float:
    return 1.0 - hscr


def _cosine(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def _hash_skill_vector(skills: set[str], dim: int = EMBED_DIM) -> list[float]:
    vec = [0.0] * dim
    for sid in skills:
        digest = hashlib.sha256(sid.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vec[idx] += sign
    return vec


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 0.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def compute_sssa(
    required: set[str],
    candidate: set[str],
    required_embedding: list[float] | None = None,
    candidate_embedding: list[float] | None = None,
) -> float:
    if required_embedding and candidate_embedding:
        return _cosine(list(required_embedding), list(candidate_embedding))

    # Bag-of-skills hashed one-hot / feature hashing fallback
    req_vec = _hash_skill_vector(required)
    cand_vec = _hash_skill_vector(candidate)
    if any(req_vec) or any(cand_vec):
        score = _cosine(req_vec, cand_vec)
        if score > 0.0 or (required and candidate):
            return score

    # Jaccard on skill sets when embeddings/hash vectors are uninformative
    return jaccard(required, candidate)


@dataclass
class MatchScores:
    hscr: float
    sgi: float
    sssa: float
    matched_skills: list[str]
    missing_skills: list[str]


def compute_match(
    required_skills: set[str],
    candidate_skills: set[str],
    required_embedding: list[float] | None = None,
    candidate_embedding: list[float] | None = None,
) -> MatchScores:
    hscr = compute_hscr(required_skills, candidate_skills)
    sgi = compute_sgi(hscr)
    sssa = compute_sssa(
        required_skills,
        candidate_skills,
        required_embedding=required_embedding,
        candidate_embedding=candidate_embedding,
    )
    matched = sorted(required_skills & candidate_skills)
    missing = sorted(required_skills - candidate_skills)
    return MatchScores(
        hscr=round(hscr, 4),
        sgi=round(sgi, 4),
        sssa=round(sssa, 4),
        matched_skills=matched,
        missing_skills=missing,
    )
