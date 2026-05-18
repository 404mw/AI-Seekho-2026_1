from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.api.dependencies import get_db_session
from app.models.service_category import ServiceCategory
from app.schemas.response import APIResponse

router = APIRouter(prefix="/catalog", tags=["Catalog"])
SessionDep = Annotated[Session, Depends(get_db_session)]


@router.get("/categories", response_model=APIResponse)
def list_categories(session: SessionDep) -> APIResponse:
    categories = session.exec(select(ServiceCategory)).all()
    return APIResponse(data=[c.model_dump() for c in categories])


@router.get("/categories/{category_id}", response_model=APIResponse)
def get_category(category_id: uuid.UUID, session: SessionDep) -> APIResponse:
    cat = session.get(ServiceCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")
    return APIResponse(data=cat.model_dump())
