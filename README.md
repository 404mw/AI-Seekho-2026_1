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

1. **Understands** the intent — extracts service type, location, and time
2. **Discovers** nearby providers matching the request
3. **Recommends** the best-fit provider with clear reasoning (distance, rating, availability)
4. **Simulates** the full booking lifecycle — confirmation, scheduling, receipt
5. **Follows up** — reminder 1 hour before the appointment, status updates

---

## Architecture

**Stack:** Python · FastAPI · SQLModel · PostgreSQL · Google Antigravity · Supabase Auth

```
User Request (NL Prompt)
        │
        ▼
 POST /api/v1/requests
        │
        ▼
┌─────────────────────────────────────────┐
│          Google Antigravity             │
│                                         │
│  ┌──────────┐   ┌───────────┐           │
│  │  Intent  │──▶│ Discovery │           │
│  │  Agent   │   │  Agent    │           │
│  └──────────┘   └─────┬─────┘           │
│                       │                 │
│               ┌───────▼──────┐          │
│               │  Decision    │          │
│               │  Agent       │          │
│               └───────┬──────┘          │
│                       │                 │
│               ┌───────▼──────┐          │
│               │  Booking     │          │
│               │  Agent       │          │
│               └──────────────┘          │
└─────────────────────────────────────────┘
        │
        ▼
  Booking Created → Follow-Up Scheduled
```

Every agent step is logged to the `AgentTrace` table (reasoning, structured output, execution time) and exposed via `GET /api/v1/requests/{id}/trace`.

Full architecture details: [`docs/architecture.md`](docs/architecture.md)

Antigravity orchestration deep-dive: [`docs/antigravity_usage.md`](docs/antigravity_usage.md)

---

## Google Antigravity Usage

Antigravity is the **core orchestration layer** — not a wrapper. It manages:

| Responsibility | Detail |
|---|---|
| **Multi-agent pipeline** | Sequences Intent → Discovery → Decision → Booking agents with state passed between steps |
| **Tool integration** | Calls Google Maps / Places API for provider geolocation and distance calculation |
| **Structured reasoning** | Each agent returns a typed Pydantic schema; Antigravity enforces the contract between stages |
| **Async execution** | The pipeline runs in the background; the client polls `/requests/{id}/status` |
| **Trace & observability** | Full reasoning logs and tool call records are captured per agent step |

External LLMs (Google Gemini via `google-genai`) are used for natural language understanding within individual agents, but Antigravity owns the workflow graph, state management, and execution order.

---

## APIs & Tools Used

| Tool / API | Purpose |
|---|---|
| **Google Antigravity** | Multi-agent workflow orchestration |
| **Google Gemini** (`google-genai`) | NL understanding — intent extraction, reasoning |
| **Google Maps / Places API** | Provider geolocation, distance matrix, nearby search |
| **Supabase Auth** | Authentication — JWT-based, no custom auth routes |
| **PostgreSQL** | Primary datastore (via SQLModel ORM) |
| **FastAPI** | REST API layer |

---

## API Overview

Base URL: `/api/v1`

| Group | Routes | Description |
|---|---|---|
| Users | `/users/me` | Profile management |
| Providers | `/providers`, `/providers/me` | Provider profiles, offerings, schedule |
| Requests | `/requests` | Submit NL prompt, poll pipeline status, view trace |
| Bookings | `/bookings` | Booking management for users and providers |
| Reviews | `/bookings/{id}/review` | Post-completion feedback |
| Catalog | `/catalog/categories` | Read-only service category list |

Full endpoint reference: [`docs/api_endpoints.md`](docs/api_endpoints.md)

Database schema: [`docs/db_schema.md`](docs/db_schema.md)

---

## Project Structure

```
backend/
├── app/
│   ├── main.py             # FastAPI entry point
│   ├── config.py           # Loads config.json + .env
│   ├── api/routes/         # One file per resource group
│   ├── agents/             # One file per agent (intent, discovery, decision, booking)
│   ├── services/           # Business logic (maps, matching)
│   ├── models/             # SQLModel entities (one file per table)
│   └── schemas/            # Pydantic request/response schemas
├── tests/                  # Mirrors app structure
├── config.json             # Behavior configuration
└── .env.example            # Secret template (never committed)
```

---

## Assumptions & Limitations

| Area | Assumption / Limitation |
|---|---|
| **Provider data** | Uses a mock/seeded dataset. Real provider sign-ups are supported but no providers are pre-enrolled. |
| **Location** | Provider geolocation is stored as lat/lng strings. Distance calculation uses Google Maps Distance Matrix API; falls back to Haversine formula if API is unavailable. |
| **Payments** | `payment_status` and `payment_intent_id` fields exist in the schema but no payment gateway is integrated. All bookings are simulated as confirmed without actual payment. |
| **Follow-up** | Reminders and status updates are simulated (logged + returned in the trace). No real SMS/email notifications are sent. |
| **Language** | Urdu/Roman Urdu support depends on Gemini's multilingual capability. Accuracy may vary for highly colloquial or mixed-script input. |
| **Concurrency** | The async pipeline is a background task. Under load, no queue (e.g., Celery/Redis) is used — this is a hackathon prototype. |
| **Auth** | Supabase Auth handles all credential management. The backend only verifies JWTs — it does not issue tokens or manage sessions. |

---

## Deliverables

| # | Deliverable | Location |
|---|---|---|
| 1 | Working Prototype | Mobile App (primary) + Web App (optional) |
| 2 | Demo Video | 3–5 min, full end-to-end flow |
| 3 | Agent Trace / Logs | `GET /api/v1/requests/{id}/trace` |
| 4 | Documentation | This file + `docs/` |
