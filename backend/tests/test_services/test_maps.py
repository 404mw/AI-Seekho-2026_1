from __future__ import annotations

from app.services.maps import _haversine, _haversine_all


def test_haversine_g13_to_g11():
    dist = _haversine(33.6844, 72.9747, 33.6938, 72.9904)
    assert 1.5 < dist < 3.0


def test_haversine_same_point_is_zero():
    assert _haversine(33.6844, 72.9747, 33.6844, 72.9747) == 0.0


def test_haversine_all_returns_all_candidates():
    result = _haversine_all(
        origin="33.6844,72.9747",
        candidate_ids=["a", "b"],
        candidate_geos={"a": "33.6938,72.9904", "b": "33.7092,73.0232"},
    )
    assert set(result.keys()) == {"a", "b"}
    assert result["a"]["distance_km"] < result["b"]["distance_km"]


def test_haversine_all_missing_geo_returns_zero():
    result = _haversine_all(
        origin="33.6844,72.9747",
        candidate_ids=["x"],
        candidate_geos={},
    )
    assert result["x"]["distance_km"] == 0.0
