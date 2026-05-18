# Backend — Developer Guide

Python · FastAPI · SQLModel · PostgreSQL · Google Antigravity

---

## Prerequisites

- Python 3.11+
- [`uv`](https://docs.astral.sh/uv/) (package manager)
- PostgreSQL running locally (or a Supabase project for hosted Postgres)
- A Supabase project (for Auth JWT verification)
- Google Gemini API key

---

## Setup

```bash
# 1. Install dependencies
uv sync

# 2. Copy the secrets template and fill it in
cp .env.example .env
```

Required `.env` values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@localhost:5432/aiseekho` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase → Settings → API |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key |

---

## Running the Dev Server

```bash
uv run uvicorn app.main:app --reload
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## Running Tests

```bash
uv run pytest
```

Tests live in `tests/` and mirror the `app/` structure. A running PostgreSQL instance pointed to by `DATABASE_URL` is required — tests use a real DB, not mocks.

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app init, router registration
│   ├── config.py               # Loads config.json + validates .env via pydantic-settings
│   │
│   ├── api/
│   │   ├── dependencies.py     # verify_supabase_token(), get_db_session()
│   │   └── routes/
│   │       ├── users.py        # /users/me
│   │       ├── providers.py    # /providers, /providers/me + offerings/schedule/time-off
│   │       ├── requests.py     # /requests — agent pipeline trigger + polling
│   │       ├── bookings.py     # /bookings — user & provider views
│   │       ├── reviews.py      # /bookings/{id}/review
│   │       └── catalog.py      # /catalog/categories
│   │
│   ├── agents/
│   │   ├── base.py             # Shared Antigravity runner setup
│   │   ├── intent.py           # Stage 1 — NL intent extraction
│   │   ├── discovery.py        # Stage 2 — provider search + Maps distance
│   │   ├── decision.py         # Stage 3 — ranking + selection reasoning
│   │   └── booking.py          # Stage 4 — booking creation + follow-up
│   │
│   ├── services/
│   │   ├── maps.py             # Google Maps API client + Haversine fallback
│   │   └── matching.py         # Provider scoring logic
│   │
│   ├── models/                 # SQLModel table definitions (one file per entity)
│   │   ├── user.py
│   │   ├── provider.py
│   │   ├── service_category.py
│   │   ├── provider_offering.py
│   │   ├── provider_schedule.py
│   │   ├── provider_time_off.py
│   │   ├── service_request.py
│   │   ├── agent_trace.py
│   │   ├── booking.py
│   │   └── review.py
│   │
│   └── schemas/
│       ├── request.py          # Pydantic request body schemas
│       └── response.py         # Standard response envelope
│
├── tests/
│   ├── conftest.py             # DB session fixture, test client, seed data
│   ├── test_api/               # Route-level tests
│   ├── test_agents/            # Agent pipeline unit tests
│   └── test_services/          # Business logic tests
│
├── config.json                 # Non-secret runtime configuration (scoring weights, etc.)
├── .env.example                # Secret variable template — never commit the real .env
└── pyproject.toml              # Managed by uv
```

---

## Configuration

Runtime behavior is controlled by `config.json` (not `.env`). This is the correct place for values that are not secrets:

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

Secrets (API keys, DB URI, JWT secrets) always go in `.env` — never in `config.json`.

---

## Authentication

Authentication is handled entirely by **Supabase Auth**. This backend:

- Does **not** have `/login`, `/register`, or `/refresh` routes
- Verifies the Supabase JWT on every protected route via `verify_supabase_token()` in `app/api/dependencies.py`
- Uses the Supabase `auth.users.id` UUID directly as the primary key in `User` and `Provider` tables

After a successful Supabase sign-up, the client must call `/api/v1/users/me/sync` (or `/providers/me/sync`) once to create the application-level record.

---

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `fastapi` | ≥ 0.136.1 | REST API framework |
| `uvicorn` | ≥ 0.47.0 | ASGI server |
| `sqlmodel` | ≥ 0.0.38 | ORM + Pydantic model unification |
| `google-genai` | ≥ 2.3.0 | Gemini LLM client for agent reasoning |
| `pydantic-settings` | ≥ 2.14.1 | Typed `.env` loading |
| `httpx` | ≥ 0.28.1 | Async HTTP client (Maps API, test client) |
| `pytest` + `pytest-asyncio` | ≥ 9 / ≥ 1.3 | Test runner |

---

## Further Reading

- API endpoint reference: [`../docs/api_endpoints.md`](../docs/api_endpoints.md)
- Database schema: [`../docs/db_schema.md`](../docs/db_schema.md)
- Antigravity agent orchestration: [`../docs/antigravity_usage.md`](../docs/antigravity_usage.md)
