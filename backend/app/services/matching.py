from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScoringWeights:
    distance: float = 0.40
    rating: float = 0.35
    price: float = 0.25


@dataclass
class CandidateInput:
    provider_id: str
    offering_id: str
    business_name: str
    distance_km: float
    rating: float
    base_price: float


@dataclass
class ScoredCandidate:
    provider_id: str
    offering_id: str
    business_name: str
    score: float
    distance_km: float
    rating: float
    base_price: float


def score_candidates(
    candidates: list[CandidateInput],
    weights: Optional[ScoringWeights] = None,
) -> list[ScoredCandidate]:
    """
    Applies weighted scoring to provider candidates; returns sorted by score descending.

    - distance: lower is better → (1 - dist/max_dist)
    - rating: higher is better → (rating / 5.0)
    - price: lower is better → (1 - price/max_price)
    """
    if not candidates:
        return []

    w = weights or ScoringWeights()
    max_dist = max(c.distance_km for c in candidates) or 1.0
    max_price = max(c.base_price for c in candidates) or 1.0

    scored = []
    for c in candidates:
        dist_score = 1.0 - (c.distance_km / max_dist)
        rating_score = c.rating / 5.0
        price_score = 1.0 - (c.base_price / max_price)
        total = w.distance * dist_score + w.rating * rating_score + w.price * price_score
        scored.append(ScoredCandidate(
            provider_id=c.provider_id,
            offering_id=c.offering_id,
            business_name=c.business_name,
            score=round(total, 4),
            distance_km=c.distance_km,
            rating=c.rating,
            base_price=c.base_price,
        ))

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored
