from __future__ import annotations

from app.services.matching import CandidateInput, ScoringWeights, score_candidates


def make_candidate(pid: str, dist: float, rating: float, price: float) -> CandidateInput:
    return CandidateInput(pid, f"offering_{pid}", f"Provider {pid}", dist, rating, price)


def test_score_candidates_sorts_descending():
    candidates = [
        make_candidate("a", 2.1, 4.7, 1500),
        make_candidate("b", 4.3, 4.2, 1200),
        make_candidate("c", 6.1, 3.8, 2000),
    ]
    results = score_candidates(candidates)
    assert results[0].provider_id == "a"


def test_score_candidates_empty_returns_empty():
    assert score_candidates([]) == []


def test_score_custom_weights():
    candidates = [
        make_candidate("a", 0.1, 2.0, 5000),  # very close, low rating, expensive
        make_candidate("b", 10.0, 5.0, 100),  # far, top rating, cheap
    ]
    results = score_candidates(candidates, ScoringWeights(distance=0.1, rating=0.5, price=0.4))
    assert results[0].provider_id == "b"
