"""Unit tests for the scoring math in app/matching.py — no DB, no HTTP."""

from app.matching import compute_hscr, compute_match, compute_sgi, compute_sssa, jaccard


def test_hscr_full_coverage():
    assert compute_hscr({"python", "sql"}, {"python", "sql", "docker"}) == 1.0


def test_hscr_partial_coverage():
    assert compute_hscr({"python", "sql", "docker"}, {"python"}) == 1 / 3


def test_hscr_with_no_required_skills_is_perfect_match():
    assert compute_hscr(set(), {"python"}) == 1.0


def test_sgi_is_the_complement_of_hscr():
    assert compute_sgi(0.75) == 0.25


def test_sssa_prefers_embeddings_when_both_present():
    # Orthogonal-ish vectors would score ~0 on a skill-overlap fallback,
    # so a non-trivial cosine here proves the embedding path was used.
    required_emb = [1.0, 0.0, 0.0]
    candidate_emb = [1.0, 0.0, 0.0]
    score = compute_sssa({"a"}, {"b"}, required_embedding=required_emb, candidate_embedding=candidate_emb)
    assert score == 1.0


def test_sssa_falls_back_to_hashed_skills_without_embeddings():
    score = compute_sssa({"python"}, {"python"})
    assert score == 1.0  # identical skill sets hash to identical vectors


def test_sssa_falls_back_to_jaccard_when_both_skill_sets_empty():
    assert compute_sssa(set(), set()) == 0.0


def test_jaccard_basic():
    assert jaccard({"a", "b"}, {"b", "c"}) == 1 / 3


def test_compute_match_reports_matched_and_missing_skills():
    result = compute_match({"python", "sql", "docker"}, {"python", "react"})
    assert result.matched_skills == ["python"]
    assert result.missing_skills == ["docker", "sql"]
    assert result.hscr == round(1 / 3, 4)
    assert result.sgi == round(1 - 1 / 3, 4)
