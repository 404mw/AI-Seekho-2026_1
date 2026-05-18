# Google Antigravity — Orchestration Design

This document describes how Google Antigravity is used as the **core orchestration platform** for the AI-Seekho system. Antigravity is not a wrapper around a single LLM call — it owns the workflow graph, state management, tool dispatch, and execution contract between agents.

---

## Why Antigravity

A single LLM call cannot reliably handle the full lifecycle of a service request. The system needs to:

- Execute **distinct reasoning steps** with different goals (understand → find → rank → book)
- **Pass structured state** between steps without information loss
- **Call external tools** (Maps API, database) at the right point in the pipeline
- **Fail gracefully** at any stage and surface the failure with context
- Produce an **auditable trace** that judges can inspect

Antigravity provides all of this as a managed execution environment. Individual agents (powered by Gemini) handle language tasks; Antigravity handles coordination, tool dispatch, and state.

---

## Pipeline Overview

```
User NL Prompt
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                  Antigravity Runner                 │
│                                                     │
│  Stage 1        Stage 2         Stage 3    Stage 4  │
│ ┌─────────┐   ┌───────────┐   ┌────────┐ ┌───────┐ │
│ │ Intent  │──▶│ Discovery │──▶│Decision│▶│Booking│ │
│ │  Agent  │   │   Agent   │   │ Agent  │ │ Agent │ │
│ └─────────┘   └───────────┘   └────────┘ └───────┘ │
│      │              │              │          │      │
│  ExtractedIntent  ProviderList  RankedMatch  Booking │
│  (typed schema)   (typed schema)(typed schema)(receipt)│
└─────────────────────────────────────────────────────┘
      │
      ▼
 AgentTrace rows written per stage
 ServiceRequest.current_agent_stage updated per stage
```

Each stage runs sequentially. The **output schema of one stage is the input to the next** — Antigravity enforces this contract. If any stage fails, the pipeline halts, the failure is logged to `AgentTrace`, and `ServiceRequest.status` is set to `failed`.

---

## Agent Definitions

### Agent 1 — Intent (`app/agents/intent.py`)

**Goal:** Parse the raw natural language prompt into a structured, typed intent object.

**Antigravity role:** Receives the raw prompt string. Calls Gemini with a structured output schema. Returns `ExtractedIntent`.

**Tools available to this agent:** None — pure language understanding.

**Input:**
```json
{
  "prompt": "Mujhe kal subah G-13 mein AC technician chahiye"
}
```

**Output schema (`ExtractedIntent`):**
```json
{
  "service_type": "AC Technician",
  "location_text": "G-13",
  "requested_time_text": "kal subah",
  "resolved_datetime_utc": "2026-05-19T05:00:00Z",
  "language_detected": "roman_urdu",
  "confidence": 0.96
}
```

**Reasoning logged:** Which entities were extracted and why, how the time expression was resolved, language detection result.

---

### Agent 2 — Discovery (`app/agents/discovery.py`)

**Goal:** Find providers who match the extracted intent by service category, location, and availability.

**Antigravity role:** Receives `ExtractedIntent`. Dispatches two tools in sequence — a database lookup then a Maps API call for distance calculation. Returns `ProviderList`.

**Tools registered:**

| Tool | Purpose |
|---|---|
| `db_search_providers` | Queries `Provider` + `ProviderOffering` + `ProviderSchedule` tables for candidates matching service category and city |
| `maps_distance_matrix` | Calls Google Maps Distance Matrix API to get real driving distances and ETAs from the user's location to each candidate |

**Output schema (`ProviderList`):**
```json
{
  "candidates": [
    {
      "provider_id": "uuid",
      "business_name": "Ali AC Services",
      "distance_km": 2.1,
      "drive_time_minutes": 8,
      "rating": 4.7,
      "is_available": true,
      "offering_id": "uuid",
      "base_price": 1500
    }
  ],
  "total_found": 4
}
```

**Reasoning logged:** How many providers were found in DB, which were filtered out due to availability conflicts, distance results from Maps API.

---

### Agent 3 — Decision (`app/agents/decision.py`)

**Goal:** Rank candidates and select the best match with an explanation a user can understand.

**Antigravity role:** Receives `ProviderList`. Calls Gemini to apply a scoring model and generate human-readable reasoning. No external tool calls — this is a pure reasoning step.

**Scoring weights (configured in `config.json`):**

| Factor | Default Weight |
|---|---|
| Distance | 40% |
| Rating | 35% |
| Price (lower = better) | 25% |

**Output schema (`RankedMatch`):**
```json
{
  "selected_provider_id": "uuid",
  "selected_offering_id": "uuid",
  "score": 0.89,
  "reasoning": "Ali AC Services is the closest available provider at 2.1 km with a 4.7 rating. Two other providers were further away (4.3 km, 6.1 km) and one had a schedule conflict for the requested time.",
  "runner_up_provider_id": "uuid",
  "all_scores": [
    { "provider_id": "uuid", "score": 0.89 },
    { "provider_id": "uuid", "score": 0.71 }
  ]
}
```

**Reasoning logged:** Full scoring breakdown per candidate, why the runner-up was not selected.

---

### Agent 4 — Booking (`app/agents/booking.py`)

**Goal:** Simulate the full booking transaction — create the `Booking` record, generate a confirmation receipt, and schedule the follow-up reminder.

**Antigravity role:** Receives `RankedMatch` + `ExtractedIntent`. Dispatches tools to write to the database and produce the confirmation artifact.

**Tools registered:**

| Tool | Purpose |
|---|---|
| `db_create_booking` | Writes a `Booking` row with `status = Confirmed`, linking user, provider, offering, and scheduled time |
| `db_update_service_request` | Updates `ServiceRequest.current_agent_stage = Completed` and `status = completed` |
| `generate_confirmation` | Produces a structured booking receipt (provider name, time, estimated cost, confirmation ID) |
| `schedule_reminder` | Logs a simulated reminder event 1 hour before the appointment (written to `AgentTrace` with `agent_name = "follow_up_scheduler"`) |

**Output schema (`BookingConfirmation`):**
```json
{
  "booking_id": "uuid",
  "provider_name": "Ali AC Services",
  "scheduled_start": "2026-05-19T05:00:00Z",
  "scheduled_end": "2026-05-19T06:30:00Z",
  "estimated_cost": 1500,
  "status": "Confirmed",
  "reminder_scheduled_at": "2026-05-19T04:00:00Z",
  "confirmation_message": "Your AC Technician has been booked for tomorrow at 10:00 AM. Ali AC Services will arrive at G-13. Estimated cost: Rs. 1,500."
}
```

**Reasoning logged:** Booking slot selected, confirmation generated, reminder scheduled.

---

## Tool Integration Detail

All tools are registered with Antigravity before the pipeline runs. Antigravity manages dispatch, retries, and error surfacing.

### `db_search_providers`
- Executes a SQLModel query against the local PostgreSQL instance
- Filters by `ServiceCategory.name` (matched from `ExtractedIntent.service_type`), `Provider.city`, `Provider.is_active`, and schedule availability for the requested datetime
- Returns raw candidates before distance scoring

### `maps_distance_matrix`
- Calls `https://maps.googleapis.com/maps/api/distancematrix/json`
- Origin: `User.geo_location` (lat/lng from user profile)
- Destinations: array of `Provider.geo_location` values from candidate list
- Returns driving distance (km) and duration (minutes) per provider
- Falls back to Haversine straight-line distance if API key is unavailable or quota exceeded

### `db_create_booking`
- Inserts a `Booking` record via SQLModel
- Sets `status = Confirmed`, `payment_status = Pending` (stub — no payment gateway)
- Returns the created `Booking.id`

### `generate_confirmation`
- Formats a human-readable confirmation string in the user's detected language
- Includes: provider name, scheduled time in local timezone (PKT), estimated cost, booking ID

### `schedule_reminder`
- Writes an `AgentTrace` row with `agent_name = "follow_up_scheduler"` at `reminder_scheduled_at` time
- Simulates the reminder — no real push notification or SMS is sent at this stage

---

## State Flow Between Agents

Antigravity maintains a shared context object that accumulates across stages:

```
PipelineContext {
  service_request_id: UUID
  user_id: UUID
  raw_prompt: str

  // populated by stage 1
  extracted_intent: ExtractedIntent | None

  // populated by stage 2
  provider_list: ProviderList | None

  // populated by stage 3
  ranked_match: RankedMatch | None

  // populated by stage 4
  booking_confirmation: BookingConfirmation | None
}
```

Each agent reads only the fields it needs and writes only to its designated output field. Antigravity validates that the required upstream fields are populated before dispatching each stage.

---

## Async Execution Model

The pipeline is enqueued as a background task when `POST /api/v1/requests` is called. The endpoint returns `202 Accepted` immediately with the `service_request_id`.

The client polls `GET /api/v1/requests/{id}/status` to observe progress:

```
pending → intent → discovery → decision → booking → completed
                                                   ↘ failed
```

`ServiceRequest.current_agent_stage` is updated after each stage completes. The client does not need to stay connected — it can poll at any interval.

---

## Observability: Agent Trace

Every agent stage writes one or more rows to `AgentTrace`. The full trace is available at:

```
GET /api/v1/requests/{id}/trace
```

Example trace response:

```json
[
  {
    "agent_name": "intent_agent",
    "status": "Success",
    "structured_output": { "service_type": "AC Technician", ... },
    "reasoning_log": "Detected Roman Urdu. Extracted service: AC Technician. Location: G-13. Time: kal subah resolved to 2026-05-19 10:00 PKT.",
    "execution_time_ms": 812
  },
  {
    "agent_name": "discovery_agent",
    "status": "Success",
    "structured_output": { "total_found": 4, "candidates": [...] },
    "reasoning_log": "4 providers found in DB for AC Technician in Islamabad. 1 filtered (schedule conflict). Maps API returned distances for 3 candidates.",
    "execution_time_ms": 1340
  },
  {
    "agent_name": "decision_agent",
    "status": "Success",
    "structured_output": { "selected_provider_id": "...", "score": 0.89, ... },
    "reasoning_log": "Scoring: Ali AC Services (0.89), Khan Cooling (0.71), City Tech (0.63). Ali selected: closest + highest rating.",
    "execution_time_ms": 654
  },
  {
    "agent_name": "booking_agent",
    "status": "Success",
    "structured_output": { "booking_id": "...", "status": "Confirmed", ... },
    "reasoning_log": "Booking created. Confirmation generated. Reminder scheduled for 2026-05-19T04:00:00Z.",
    "execution_time_ms": 430
  },
  {
    "agent_name": "follow_up_scheduler",
    "status": "Scheduled",
    "structured_output": { "reminder_at": "2026-05-19T04:00:00Z", "message": "Reminder: Your AC Technician arrives in 1 hour." },
    "reasoning_log": "Simulated reminder logged.",
    "execution_time_ms": 12
  }
]
```

This trace is the primary evidence of agentic reasoning for evaluation purposes.

---

## Alignment With Evaluation Criteria

| Criterion | How Antigravity Satisfies It |
|---|---|
| **Use of Google Antigravity (25%)** | Antigravity is the execution engine for all 4 agents. Tool dispatch, state passing, and pipeline sequencing all run through it. |
| **Agentic Reasoning & Workflow (20%)** | 4 discrete agents with distinct goals, typed schemas enforcing clean handoffs, full reasoning logs per stage. |
| **Matching Quality & Decision Logic (20%)** | Decision Agent applies a configurable weighted scoring model with per-candidate reasoning logged to `AgentTrace`. |
| **Action Simulation & Execution (15%)** | Booking Agent creates a real `Booking` DB record, generates a confirmation receipt, and logs a simulated reminder — full E2E state change. |
