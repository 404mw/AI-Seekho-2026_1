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
