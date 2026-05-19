# AI-Seekho — Agentic Service Marketplace

An agentic AI system that automates the end-to-end lifecycle of informal service requests — from natural language input to booking confirmation and follow-up.

Built for the **AI-Seekho 2026 Hackathon**, powered by **Google Antigravity** as the core orchestration platform.

---

## Problem

The informal service economy (plumbers, electricians, AC technicians, tutors, beauticians) still operates through WhatsApp messages and phone calls. Users struggle to find reliable providers quickly, and providers miss bookings due to lack of automation.

---

## What It Does

A user types a request in **English, Urdu, or Roman Urdu**:

> "Mujhe kal subah G-13 mein AC technician chahiye"

The system automatically:

1. **Understands** the intent — extracts service type, location, and time via Gemini
2. **Discovers** nearby providers matching the request using Google Maps Distance Matrix
3. **Recommends** the best-fit provider with weighted scoring (distance 40%, rating 35%, price 25%)
4. **Books** — creates a `Booking` DB record, generates a confirmation receipt
5. **Follows up** — logs a simulated reminder 1 hour before the appointment

---

## Architecture

**Backend:** Python · FastAPI · SQLModel · PostgreSQL · Google Antigravity · Google Gemini · Supabase Auth

**Frontend:** Expo SDK 54 · React Native 0.81.5 · TypeScript · Expo Router v6 · Supabase JS

```
User NL Prompt (mobile app)
        │
        ▼
 POST /api/v1/requests  ──→ 202 Accepted immediately
        │
        ▼ (background task)
┌─────────────────────────────────────────────────────┐
│               Google Antigravity Runner             │
│                                                     │
│  Stage 1        Stage 2         Stage 3    Stage 4  │
│ ┌─────────┐   ┌───────────┐   ┌────────┐ ┌───────┐ │
│ │ Intent  │──▶│ Discovery │──▶│Decision│▶│Booking│ │
│ │  Agent  │   │   Agent   │   │ Agent  │ │ Agent │ │
│ └─────────┘   └───────────┘   └────────┘ └───────┘ │
│  ExtractedIntent ProviderList RankedMatch  Receipt   │
└─────────────────────────────────────────────────────┘
        │
        ▼
  Booking Created → AgentTrace logged → Follow-Up Scheduled
```

The client polls `GET /api/v1/requests/{id}/status` until `status` is `completed` or `failed`.

Every agent step is logged to the `AgentTrace` table (reasoning, structured output, execution time) and exposed via `GET /api/v1/requests/{id}/trace`.

Full architecture details: [`docs/architecture.md`](docs/architecture.md)

Antigravity orchestration deep-dive: [`docs/antigravity_usage.md`](docs/antigravity_usage.md)

---

## Google Antigravity Usage

Antigravity is the **core orchestration layer** — not a wrapper. It manages:

| Responsibility | Detail |
|---|---|
| **Multi-agent pipeline** | Sequences Intent → Discovery → Decision → Booking agents with typed state passed between steps |
| **Tool integration** | Calls Google Maps / Places API for provider geolocation and distance calculation |
| **Structured reasoning** | Each agent returns a typed Pydantic schema; Antigravity enforces the contract between stages |
| **Async execution** | The pipeline runs as a background task; the client polls `/requests/{id}/status` |
| **Trace & observability** | Full reasoning logs and tool call records are captured per agent step in `AgentTrace` |

---

## APIs & Tools Used

| Tool / API | Purpose |
|---|---|
| **Google Antigravity** | Multi-agent workflow orchestration |
| **Google Gemini** (`google-genai`) | NL understanding — intent extraction, scoring reasoning |
| **Google Maps Distance Matrix API** | Provider geolocation, distance and ETA per candidate |
| **Supabase Auth** | Authentication — JWT-based, no custom auth routes |
| **PostgreSQL** | Primary datastore (via SQLModel ORM) |
| **FastAPI** | REST API layer |
| **Expo SDK 54 / React Native** | Android mobile frontend |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # Loads config.json + .env
│   ├── api/
│   │   ├── dependencies.py         # verify_supabase_token(), DB session
│   │   └── routes/                 # users · providers · requests · bookings · reviews · catalog
│   ├── agents/
│   │   ├── base.py                 # BaseAgentRunner, record_trace helpers
│   │   ├── intent.py               # Stage 1: NL → ExtractedIntent
│   │   ├── discovery.py            # Stage 2: DB + Maps → ProviderList
│   │   ├── decision.py             # Stage 3: weighted scoring → RankedMatch
│   │   └── booking.py              # Stage 4: DB write + receipt → BookingConfirmation
│   ├── services/
│   │   ├── maps.py                 # Google Maps Distance Matrix + Haversine fallback
│   │   └── matching.py             # Provider candidate filtering
│   ├── models/                     # SQLModel entities (one file per table)
│   └── schemas/                    # Pydantic request/response schemas
├── scripts/
│   └── seed_mock_data.py           # Populates providers, categories, and schedules
├── tests/                          # Mirrors app/ structure — 100% passing
│   ├── conftest.py
│   ├── test_agents/
│   ├── test_api/
│   └── test_services/
├── config.json                     # Behavior configuration (scoring weights, timeouts)
└── .env.example                    # Secret template

frontend/
├── app/                            # Expo Router routes (routes only)
│   ├── _layout.tsx                 # Root layout: auth gate + ModeContext
│   ├── (auth)/                     # sign-in · sign-up (with Customer / Provider role select)
│   ├── (customer)/                 # Home (NL form) · Requests · Bookings · Profile
│   └── (provider)/                 # Dashboard · Bookings · Manage · Profile
├── components/
│   ├── forms/request-form.tsx      # Natural language request entry
│   └── ui/                         # booking-card · provider-card · progress-tracker · stage-indicator
├── hooks/                          # use-auth · use-requests · use-bookings · use-poll
├── context/                        # auth-context · mode-context (Customer ↔ Provider switch)
├── lib/                            # supabase.ts · api.ts · types.ts
└── constants/                      # colors.ts · tokens.ts · config.ts
```

---

## Getting Started

### Backend

**Prerequisites:** Python ≥ 3.11, [`uv`](https://docs.astral.sh/uv/), PostgreSQL

```bash
cd backend

# Install dependencies
uv sync

# Configure environment
cp .env.example .env
# Fill in DATABASE_URL, SUPABASE_URL, SUPABASE_JWT_SECRET, GEMINI_API_KEY, GOOGLE_MAPS_API_KEY

# Run database migrations (SQLModel creates tables on startup)
uv run python -c "from app.main import create_db_and_tables; create_db_and_tables()"

# Seed mock providers and categories
uv run python scripts/seed_mock_data.py

# Start the API server
uv run uvicorn app.main:app --reload --port 8000
```

Run the test suite:

```bash
uv run pytest
```

### Frontend

**Prerequisites:** Node.js ≥ 20, npm, Android device or emulator

```bash
cd frontend

npm install

# Configure environment
cp .env.local.example .env.local   # or create manually
# Fill in EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
# EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000/api/v1  ← for Android emulator

# Start Expo dev server
npx expo start
```

---

## Configuration

### Backend — `backend/config.json`

```json
{
  "scoring_weights": {
    "distance": 0.40,
    "rating":   0.35,
    "price":    0.25
  },
  "agent_timeout_seconds": 30,
  "maps_fallback_to_haversine": true,
  "max_provider_candidates": 10
}
```

### Backend — Environment Variables (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL (Settings → API) |
| `SUPABASE_JWT_SECRET` | JWT secret for token verification (Settings → API) |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Distance Matrix API key |

### Frontend — Environment Variables (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `EXPO_PUBLIC_API_BASE_URL` | Backend base URL (e.g. `http://10.0.2.2:8000/api/v1` for emulator) |

---

## API Overview

Base URL: `/api/v1`

| Group | Routes | Description |
|---|---|---|
| Users | `POST /users/me/sync` · `GET /users/me` · `PUT /users/me` | Profile sync and management |
| Providers | `GET/PUT /providers/me` · `GET /providers` · offerings · schedule · time-off | Provider profiles and availability |
| Requests | `POST /requests` · `GET /requests/{id}/status` · `/trace` | Submit NL prompt, poll pipeline, view agent trace |
| Bookings | `GET /bookings` · `PUT /bookings/{id}/cancel` · provider status updates | Booking management |
| Reviews | `POST /bookings/{id}/review` · `GET /providers/{id}/reviews` | Post-completion feedback |
| Catalog | `GET /catalog/categories` | Read-only service category list |

Full endpoint reference: [`docs/api_endpoints.md`](docs/api_endpoints.md)

Database schema: [`docs/db_schema.md`](docs/db_schema.md)

Frontend architecture: [`docs/frontend_architecture.md`](docs/frontend_architecture.md)

---

## Authentication

Supabase Auth handles all credential management. The mobile app authenticates directly with Supabase and receives a signed JWT. The backend verifies this JWT via the `verify_supabase_token()` dependency — **no custom auth routes exist**. After sign-up, the client calls `/users/me/sync` or `/providers/me/sync` once to create the application-level record.

A single Supabase account can hold both `User` and `Provider` roles. The `ModeContext` in the frontend switches between the two views without re-authentication.

---

## Assumptions & Limitations

| Area | Assumption / Limitation |
|---|---|
| **Provider data** | Mock dataset seeded via `scripts/seed_mock_data.py`. Real provider sign-ups are supported. |
| **Location** | Provider geolocation stored as lat/lng strings. Distance uses Google Maps Distance Matrix; falls back to Haversine formula if API is unavailable. |
| **Payments** | `payment_status` and `payment_intent_id` fields exist in the schema but no payment gateway is integrated. All bookings are confirmed without actual payment. |
| **Follow-up** | Reminders are simulated — logged to `AgentTrace` with `agent_name = "follow_up_scheduler"`. No real SMS/email is sent. |
| **Language** | Urdu/Roman Urdu support depends on Gemini's multilingual capability. Accuracy may vary for highly colloquial or mixed-script input. |
| **Concurrency** | The async pipeline runs as a FastAPI background task. No queue (Celery/Redis) — this is a hackathon prototype. |
| **Platform** | Frontend targets **Android** (APK). iOS layout exists but is not the primary delivery target. |

---

## Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Working Prototype | Android APK (primary) + FastAPI backend |
| 2 | Demo Video | 3–5 min, full end-to-end flow |
| 3 | Agent Trace / Logs | `GET /api/v1/requests/{id}/trace` |
| 4 | Documentation | This file + `docs/` |
