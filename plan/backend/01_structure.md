# Phase 01 — Project Structure ✅ DONE

## Status
**Implemented.** All directories, `__init__.py` files, `.env.example`, `.env`, and `config.json` are in place. `backend/main.py` placeholder was removed.

## Goal
Bootstrap the full `backend/app/` directory tree, delete the placeholder `backend/main.py`, and create the two non-secret config files.

## Files to Create

### Directory skeleton (create as empty `__init__.py` packages)

```
backend/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       └── __init__.py
│   ├── agents/
│   │   └── __init__.py
│   ├── models/
│   │   └── __init__.py
│   ├── schemas/
│   │   └── __init__.py
│   └── services/
│       └── __init__.py
├── scripts/
│   └── __init__.py
└── tests/
    ├── __init__.py
    ├── test_api/
    │   └── __init__.py
    ├── test_agents/
    │   └── __init__.py
    └── test_services/
        └── __init__.py
```

All `__init__.py` files are **empty**.

### `backend/.env.example`

```
# PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@localhost:5432/aiseekho

# Supabase project URL (from Supabase dashboard → Settings → API)
SUPABASE_URL=https://your-project-id.supabase.co

# JWT secret (from Supabase dashboard → Settings → API → JWT Secret)
SUPABASE_JWT_SECRET=your-jwt-secret-here

# Google Gemini API key
GEMINI_API_KEY=your-gemini-api-key-here

# Google Maps Distance Matrix API key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### `backend/config.json`

```json
{
  "scoring_weights": {
    "distance": 0.40,
    "rating": 0.35,
    "price": 0.25
  },
  "agent_timeout_seconds": 30,
  "maps_fallback_to_haversine": true,
  "max_provider_candidates": 10
}
```

## Actions

1. Delete `backend/main.py` (it is a placeholder stub — the real entry point will be `backend/app/main.py` created in Phase 04).
2. Create all directories and `__init__.py` files listed above.
3. Create `backend/.env.example`.
4. Create `backend/config.json`.
5. Copy `.env.example` to `.env` and fill in real credentials (developer action — do not commit `.env`).

## Verification

```bash
ls backend/app/
# should show: __init__.py  agents/  api/  models/  schemas/  services/

ls backend/tests/
# should show: __init__.py  conftest.py(not yet)  test_api/  test_agents/  test_services/
```

## Done When
- `backend/app/__init__.py` exists
- `backend/config.json` exists
- `backend/.env.example` exists
- `backend/main.py` (placeholder) is deleted
