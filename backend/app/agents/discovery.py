from __future__ import annotations

import time
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Session, select

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.agents.intent import ExtractedIntent
from app.models.provider import Provider
from app.models.provider_offering import ProviderOffering
from app.models.service_category import ServiceCategory
from app.models.service_request import ServiceRequest


class ProviderCandidate(BaseModel):
    provider_id: str
    business_name: str
    distance_km: float
    drive_time_minutes: Optional[int] = None
    rating: float
    is_available: bool
    offering_id: str
    base_price: float


class ProviderList(BaseModel):
    candidates: list[ProviderCandidate]
    total_found: int


class DiscoveryAgent(BaseAgentRunner):
    """Stage 2: Find providers matching extracted intent."""

    AGENT_NAME = "discovery_agent"

    def run(
        self,
        input_data: ExtractedIntent,
        service_request: ServiceRequest,
        session: Session,
        user_geo_location: Optional[str] = None,
    ) -> ProviderList:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "discovery")

        try:
            candidates = self._db_search_providers(session, input_data, reasoning_parts)

            if user_geo_location and candidates:
                candidates = self._maps_distance_matrix(user_geo_location, candidates, reasoning_parts)

            result = ProviderList(candidates=candidates, total_found=len(candidates))

            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Success",
                structured_output=result.model_dump(),
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            return result

        except Exception as exc:
            record_trace(
                session=session,
                service_request=service_request,
                agent_name=self.AGENT_NAME,
                status="Failed",
                structured_output={"error": str(exc)},
                reasoning_log="\n".join(reasoning_parts),
                execution_time_ms=int((time.monotonic() - start) * 1000),
            )
            _update_stage(session, service_request, "failed")
            service_request.status = "failed"
            session.add(service_request)
            session.commit()
            raise

    def _db_search_providers(
        self,
        session: Session,
        intent: ExtractedIntent,
        reasoning_parts: list[str],
    ) -> list[ProviderCandidate]:
        from app.config import runtime_config  # noqa: PLC0415
        max_candidates = runtime_config.get("max_provider_candidates", 10)

        stmt = (
            select(Provider, ProviderOffering, ServiceCategory)
            .join(ProviderOffering, Provider.id == ProviderOffering.provider_id)
            .join(ServiceCategory, ProviderOffering.category_id == ServiceCategory.id)
            .where(Provider.is_active == True)  # noqa: E712
            .where(ServiceCategory.name == intent.service_type)
            .limit(max_candidates)
        )
        rows = session.exec(stmt).all()
        reasoning_parts.append(f"{len(rows)} providers found in DB for '{intent.service_type}'")

        self._geo_map: dict[str, str] = {}
        result = []
        for provider, offering, _cat in rows:
            pid = str(provider.id)
            if provider.geo_location:
                self._geo_map[pid] = provider.geo_location
            result.append(ProviderCandidate(
                provider_id=pid,
                business_name=provider.business_name,
                distance_km=0.0,
                rating=provider.rating,
                is_available=True,
                offering_id=str(offering.id),
                base_price=offering.base_price,
            ))
        return result

    def _maps_distance_matrix(
        self,
        origin: str,
        candidates: list[ProviderCandidate],
        reasoning_parts: list[str],
    ) -> list[ProviderCandidate]:
        from app.services.maps import get_distances  # noqa: PLC0415
        geo_map = getattr(self, "_geo_map", {})
        distances = get_distances(origin=origin, candidate_ids=[c.provider_id for c in candidates], candidate_geos=geo_map)
        for candidate in candidates:
            dist = distances.get(candidate.provider_id)
            if dist:
                candidate.distance_km = dist["distance_km"]
                candidate.drive_time_minutes = dist.get("drive_time_minutes")
        reasoning_parts.append("Maps API distances applied.")
        return candidates
