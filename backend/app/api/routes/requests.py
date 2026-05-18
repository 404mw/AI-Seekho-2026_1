from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.agent_trace import AgentTrace
from app.models.service_request import ServiceRequest
from app.schemas.request import ServiceRequestCreate
from app.schemas.response import APIResponse

router = APIRouter(prefix="/requests", tags=["Requests"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


def _run_pipeline(service_request_id: uuid.UUID, database_url: str) -> None:
    from app.agents.base import run_pipeline  # noqa: PLC0415
    run_pipeline(str(service_request_id), database_url)


@router.post("", response_model=APIResponse, status_code=status.HTTP_202_ACCEPTED)
def create_request(
    body: ServiceRequestCreate,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUser,
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    service_request = ServiceRequest(
        user_id=user_id,
        raw_natural_language_prompt=body.prompt,
    )
    session.add(service_request)
    session.commit()
    session.refresh(service_request)
    from app.config import settings  # noqa: PLC0415
    background_tasks.add_task(_run_pipeline, service_request.id, settings.database_url)
    return APIResponse(
        data={"service_request_id": str(service_request.id), "status": "pending"},
        message="Pipeline enqueued.",
    )


@router.get("", response_model=APIResponse)
def list_requests(
    session: SessionDep,
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    stmt = select(ServiceRequest).where(ServiceRequest.user_id == user_id).offset((page - 1) * limit).limit(limit)
    reqs = session.exec(stmt).all()
    return APIResponse(data=[r.model_dump() for r in reqs])


@router.get("/{request_id}", response_model=APIResponse)
def get_request(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    return APIResponse(data=req.model_dump())


@router.get("/{request_id}/status", response_model=APIResponse)
def get_request_status(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    return APIResponse(data={
        "id": str(req.id),
        "current_agent_stage": req.current_agent_stage,
        "status": req.status,
    })


@router.get("/{request_id}/trace", response_model=APIResponse)
def get_request_trace(request_id: uuid.UUID, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    req = session.get(ServiceRequest, request_id)
    if not req:
        raise HTTPException(status_code=404, detail="ServiceRequest not found.")
    if req.user_id != uuid.UUID(current_user["sub"]):
        raise HTTPException(status_code=403, detail="Not your request.")
    traces = session.exec(
        select(AgentTrace).where(AgentTrace.service_request_id == request_id)
    ).all()
    return APIResponse(data=[t.model_dump() for t in traces])
