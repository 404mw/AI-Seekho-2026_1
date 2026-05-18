# Project Architecture Proposal (Finalized Stack)

Based on the strict rules established in `rules.md`, this architecture is designed to be highly modular ("one file serves one purpose"), testable, and secure.

## Finalized Technology Stack
- **Language/Framework:** Python + FastAPI
- **Package Manager:** `uv`
- **Database:** PostgreSQL for both production and local development.
- **ORM:** SQLModel
- **Authentication:** **Supabase Auth** — The client authenticates directly with Supabase and receives a signed JWT. The backend verifies this JWT via a shared `verify_supabase_token()` dependency. No custom auth routes exist in this backend. The Supabase `auth.users.id` UUID is used as the Primary Key in both the `User` and `Provider` tables.
- **Configuration:** `.json`

## Proposed Directory Structure (`backend/`)
*(Note: No files will be created until explicitly requested.)*

```text
backend/
├── config.json           # Mandatory config file for easy behavior changes
├── .env.example          # Template for secrets (the actual .env will NEVER be committed)
├── pyproject.toml        # Managed by UV for project dependencies
│
├── app/                  # Main application package
│   ├── main.py           # Application entry point (FastAPI initialization)
│   ├── config.py         # Logic to load and validate config.json and .env safely
│   │
│   ├── api/              # API Layer (Routes only, no business logic)
│   │   ├── dependencies.py # Shared dependencies (verify_supabase_token, db session)
│   │   └── routes/       # One file per resource
│   │       ├── users.py    # /users/me — user profile management
│   │       ├── providers.py# /providers — profile, offerings, schedule, time-off
│   │       ├── requests.py # /requests — async agent pipeline trigger & polling
│   │       ├── bookings.py # /bookings — booking management (user & provider views)
│   │       ├── reviews.py  # /bookings/{id}/review, /providers/{id}/reviews
│   │       └── catalog.py  # /catalog/categories — read-only service catalog
│   │
│   ├── agents/           # Antigravity Agent Logic (One file per agent workflow)
│   │   ├── base.py       # Base agent class/utilities
│   │   ├── intent.py     # Agent 1: Extracts intent from natural language
│   │   ├── discovery.py  # Agent 2: Finds relevant providers
│   │   ├── decision.py   # Agent 3: Selects the best provider
│   │   └── booking.py    # Agent 4: Simulates booking/confirmation
│   │
│   ├── services/         # Core Business Logic (Decoupled from API and Agents)
│   │   ├── maps.py       # Location/Maps integration
│   │   └── matching.py   # Fallback matching algorithms
│   │
│   ├── models/           # Database Models (SQLModel — one file per entity)
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
│   └── schemas/          # Data Validation Schemas (Pydantic/SQLModel)
│       ├── request.py
│       └── response.py
│
└── tests/                # Mandatory Tests Layer (Mirrors app structure)
    ├── conftest.py       # Test fixtures and setup
    ├── test_api/         # Tests for API routes
    ├── test_agents/      # Tests for agent logic/reasoning
    └── test_services/    # Tests for business logic
```

## Alignment With Rules
1. **One file, one purpose:** API routes, business logic, SQLModel models, and agent behaviors are segregated.
2. **Mandatory Config:** `config.json` acts as the single source of truth for tweakable behavior.
3. **Mandatory Tests:** A comprehensive `tests/` directory is mandated from day one.
4. **No Secret Leaks:** `.env.example` serves as documentation, while real secrets go in an uncommitted `.env` file.
