from __future__ import annotations

import base64
import json
from typing import Generator

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
    """Decodes Supabase JWT payload via base64 — no signature verification (demo mode)."""
    token = credentials.credentials
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed JWT: expected 3 parts")

        # urlsafe base64 decode with padding
        padded = parts[1] + "=" * (-len(parts[1]) % 4)
        payload: dict = json.loads(base64.urlsafe_b64decode(padded))

        if not payload.get("sub"):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing sub claim")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")
