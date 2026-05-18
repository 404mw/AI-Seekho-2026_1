from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    detail: str


class APIResponse(BaseModel):
    data: Any = None
    message: str = "Success"
    error: Optional[ErrorDetail] = None
