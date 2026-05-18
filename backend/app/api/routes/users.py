from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.dependencies import get_db_session, verify_supabase_token
from app.models.user import User
from app.schemas.request import UserSyncRequest, UserUpdateRequest
from app.schemas.response import APIResponse

router = APIRouter(prefix="/users", tags=["Users"])
SessionDep = Annotated[Session, Depends(get_db_session)]
CurrentUser = Annotated[dict, Depends(verify_supabase_token)]


@router.post("/me/sync", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
def sync_user(body: UserSyncRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    existing = session.get(User, user_id)
    if existing:
        for field, value in body.model_dump(exclude_none=True).items():
            setattr(existing, field, value)
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return APIResponse(data=existing.model_dump(), message="User record updated.")
    user = User(id=user_id, email=current_user.get("email", ""), **body.model_dump(exclude_none=True))
    session.add(user)
    session.commit()
    session.refresh(user)
    return APIResponse(data=user.model_dump(), message="User record created.")


@router.get("/me", response_model=APIResponse)
def get_me(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return APIResponse(data=user.model_dump())


@router.put("/me", response_model=APIResponse)
def update_me(body: UserUpdateRequest, session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return APIResponse(data=user.model_dump(), message="Profile updated.")


@router.delete("/me", response_model=APIResponse)
def delete_me(session: SessionDep, current_user: CurrentUser) -> APIResponse:
    user_id = uuid.UUID(current_user["sub"])
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user.is_active = False
    session.add(user)
    session.commit()
    return APIResponse(message="Account deactivated.")
