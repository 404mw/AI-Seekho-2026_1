# Phase 06 — Services

## Goal
Implement the two business logic service modules: `maps.py` (distance calculation) and `matching.py` (provider scoring helper). These are called by the Discovery and Decision agents.

## Prerequisites
- Phase 02 (models) complete
- Phase 03 (config) complete

---

## `backend/app/services/maps.py`

Calls Google Maps Distance Matrix API. Falls back to Haversine formula if the API key is absent or quota is exceeded. Controlled by `config.json > maps_fallback_to_haversine`.

```python
from __future__ import annotations

import math
from typing import Optional

import httpx

from app.config import settings, runtime_config


def get_distances(
    origin: str,
    candidate_ids: list[str],
    candidate_geos: Optional[dict[str, str]] = None,
) -> dict[str, dict]:
    """
    Returns {provider_id: {"distance_km": float, "drive_time_minutes": int | None}}
    for each candidate.

    origin: "lat,lng" string from User.geo_location
    candidate_ids: list of Provider.id strings
    candidate_geos: {provider_id: "lat,lng"} — required for Maps API or Haversine fallback
    """
    if not candidate_geos:
        return {cid: {"distance_km": 0.0, "drive_time_minutes": None} for cid in candidate_ids}

    fallback = runtime_config.get("maps_fallback_to_haversine", True)

    if settings.google_maps_api_key and not fallback:
        try:
            return _maps_api(origin, candidate_ids, candidate_geos)
        except Exception:
            pass  # fall through to Haversine

    return _haversine_all(origin, candidate_ids, candidate_geos)


def _maps_api(origin: str, candidate_ids: list[str], candidate_geos: dict[str, str]) -> dict[str, dict]:
    """Calls Google Maps Distance Matrix API."""
    destinations = "|".join(candidate_geos[cid] for cid in candidate_ids if cid in candidate_geos)
    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destinations,
        "mode": "driving",
        "key": settings.google_maps_api_key,
    }
    response = httpx.get(url, params=params, timeout=10.0)
    response.raise_for_status()
    data = response.json()

    result = {}
    elements = data.get("rows", [{}])[0].get("elements", [])
    valid_ids = [cid for cid in candidate_ids if cid in candidate_geos]
    for i, cid in enumerate(valid_ids):
        el = elements[i] if i < len(elements) else {}
        if el.get("status") == "OK":
            result[cid] = {
                "distance_km": el["distance"]["value"] / 1000.0,
                "drive_time_minutes": el["duration"]["value"] // 60,
            }
        else:
            result[cid] = {"distance_km": 0.0, "drive_time_minutes": None}
    return result


def _haversine_all(origin: str, candidate_ids: list[str], candidate_geos: dict[str, str]) -> dict[str, dict]:
    """Haversine straight-line distance fallback."""
    olat, olng = _parse_geo(origin)
    result = {}
    for cid in candidate_ids:
        geo = candidate_geos.get(cid)
        if geo:
            clat, clng = _parse_geo(geo)
            result[cid] = {"distance_km": _haversine(olat, olng, clat, clng), "drive_time_minutes": None}
        else:
            result[cid] = {"distance_km": 0.0, "drive_time_minutes": None}
    return result


def _parse_geo(geo: str) -> tuple[float, float]:
    lat, lng = geo.split(",")
    return float(lat.strip()), float(lng.strip())


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
```

---

## `backend/app/services/matching.py`

Scoring logic used by the Decision agent. Extracted here so it can be unit tested independently.

```python
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
    Applies the weighted scoring model to a list of provider candidates.
    Returns candidates sorted by score descending.

    Scoring:
      - distance: lower is better → normalized as (1 - dist/max_dist)
      - rating: higher is better → normalized as (rating / 5.0)
      - price: lower is better → normalized as (1 - price/max_price)
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
```

---

## Wiring `maps.py` into Discovery Agent

In `backend/app/agents/discovery.py`, the `_maps_distance_matrix` method calls `get_distances`. It needs the provider geo_locations. Update the `_db_search_providers` method to also return geo_location in a side-channel:

```python
# In DiscoveryAgent._db_search_providers, track geo_locations per provider_id:
self._geo_map: dict[str, str] = {}

for provider, offering, _cat in rows:
    if provider.geo_location:
        self._geo_map[str(provider.id)] = provider.geo_location
    candidates.append(...)

# In _maps_distance_matrix:
distances = get_distances(
    origin=user_geo_location,
    candidate_ids=[c.provider_id for c in candidates],
    candidate_geos=self._geo_map,
)
```

## Wiring `matching.py` into Decision Agent

In `backend/app/agents/decision.py`, replace the inline scoring loop with:

```python
from app.services.matching import CandidateInput, ScoringWeights, score_candidates

w = ScoringWeights(**weights)
inputs = [
    CandidateInput(
        provider_id=c.provider_id,
        offering_id=c.offering_id,
        business_name=c.business_name,
        distance_km=c.distance_km,
        rating=c.rating,
        base_price=c.base_price,
    )
    for c in candidates
]
scored = score_candidates(inputs, w)
winner = scored[0]
```

---

## Verification

```bash
cd backend
uv run python -c "
from app.services.maps import _haversine
dist = _haversine(33.6844, 72.9747, 33.6938, 72.9904)
print(f'G-13 to G-11: {dist:.2f} km')  # expect ~2 km

from app.services.matching import CandidateInput, score_candidates
results = score_candidates([
    CandidateInput('a', 'o1', 'Ali AC', 2.1, 4.7, 1500),
    CandidateInput('b', 'o2', 'Khan', 4.3, 4.2, 1200),
    CandidateInput('c', 'o3', 'City', 6.1, 3.8, 2000),
])
for r in results:
    print(r.business_name, r.score)
# Ali AC should be first
"
```

## Done When
- `services/maps.py` — `get_distances()` works with Haversine fallback (no API key required)
- `services/matching.py` — `score_candidates()` returns candidates sorted by score
- Discovery agent uses `get_distances()` from `maps.py`
- Decision agent uses `score_candidates()` from `matching.py`
