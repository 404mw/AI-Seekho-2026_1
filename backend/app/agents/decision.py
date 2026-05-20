from __future__ import annotations

import json
import time
from typing import Optional

from pydantic import BaseModel
from sqlmodel import Session

from app.agents.base import BaseAgentRunner, _update_stage, record_trace
from app.agents.discovery import ProviderList
from app.config import settings
from app.models.service_request import ServiceRequest


class CandidateScore(BaseModel):
    provider_id: str
    score: float


class RankedMatch(BaseModel):
    selected_provider_id: str
    selected_offering_id: str
    score: float
    reasoning: str
    runner_up_provider_id: Optional[str] = None
    all_scores: list[CandidateScore]


class DecisionAgent(BaseAgentRunner):
    """Stage 3: Rank provider candidates and select the best match."""

    AGENT_NAME = "decision_agent"

    def run(
        self,
        input_data: ProviderList,
        service_request: ServiceRequest,
        session: Session,
    ) -> RankedMatch:
        start = time.monotonic()
        reasoning_parts: list[str] = []
        _update_stage(session, service_request, "decision")

        try:
            from app.config import runtime_config  # noqa: PLC0415
            weights = runtime_config.get("scoring_weights", {"distance": 0.40, "rating": 0.35, "price": 0.25})

            candidates = input_data.candidates
            if not candidates:
                raise ValueError("No candidates to rank.")

            from app.services.matching import CandidateInput, ScoringWeights, score_candidates  # noqa: PLC0415
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
            scored_candidates = score_candidates(inputs, w)
            for sc in scored_candidates:
                reasoning_parts.append(
                    f"{sc.business_name}: score={sc.score:.4f} "
                    f"dist={sc.distance_km:.1f}km rating={sc.rating} price={sc.base_price}"
                )

            winner = scored_candidates[0]
            winner_score = winner.score
            runner_up = scored_candidates[1] if len(scored_candidates) > 1 else None

            candidates_json = json.dumps([
                {"name": sc.business_name, "score": sc.score, "distance_km": sc.distance_km, "rating": sc.rating}
                for sc in scored_candidates
            ])
            gemini_response = self.client.models.generate_content(
                model=settings.gemini_model,
                contents=(
                    f"Explain in 1-2 sentences why '{winner.business_name}' (score {winner_score}) "
                    f"was selected over these alternatives: {candidates_json}. "
                    "Be specific about distance, rating, and price factors."
                ),
            )
            reasoning_text = gemini_response.text.strip()

            result = RankedMatch(
                selected_provider_id=winner.provider_id,
                selected_offering_id=winner.offering_id,
                score=winner_score,
                reasoning=reasoning_text,
                runner_up_provider_id=runner_up.provider_id if runner_up else None,
                all_scores=[CandidateScore(provider_id=sc.provider_id, score=sc.score) for sc in scored_candidates],
            )

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
