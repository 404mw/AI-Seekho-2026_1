# Project Architecture Proposal (Finalized Stack)

Based on the strict rules established in `rules.md`, this architecture is designed to be highly modular ("one file serves one purpose"), testable, and secure.

## Finalized Technology Stack
- **Language/Framework:** Python + FastAPI
- **Package Manager:** `uv`
- **Database:** PostgreSQL for production, local SQLite for development.
- **ORM:** SQLModel
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
│   │   ├── dependencies.py # Shared dependencies (e.g., auth, db sessions)
│   │   └── routes/       # One file per resource
│   │       ├── requests.py # e.g., POST /requests (triggers agent flow)
│   │       └── providers.py# e.g., GET /providers
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
│   ├── models/           # Database Models (SQLModel)
│   │   ├── user.py
│   │   └── service.py
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
