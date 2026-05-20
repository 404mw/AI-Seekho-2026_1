from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str
    supabase_url: str
    supabase_jwt_secret: str
    gemini_api_key: str
    gemini_model: str = "gemini-2.5-pro"
    google_maps_api_key: str


settings = Settings()

# Non-secret runtime config from config.json
_config_path = Path(__file__).parent.parent / "config.json"
runtime_config: dict[str, Any] = json.loads(_config_path.read_text()) if _config_path.exists() else {}
