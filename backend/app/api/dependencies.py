from __future__ import annotations

from typing import Generator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, create_engine

from app.config import settings

engine = create_engine(settings.database_url, echo=False)

_bearer = HTTPBearer()


def get_db_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    """Validates the Supabase JWT; returns decoded payload. 'sub' is the user/provider UUID."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        )
