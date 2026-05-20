# Implementation Plan — Overview

## Phase Dependency Map

```
01_structure  ──┐
                ▼
           02_models ──────────┐
                               ▼
                   03_config_schemas_deps
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
              04_routes_main         05_agents
                    │                     │
                    └──────────┬──────────┘
                               ▼
                          06_services
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               07_tests              08_seed
```

## Phase Summary

| # | File | Creates | Prerequisite | Status |
|---|------|---------|--------------|--------|
| 01 | `01_structure.md` | Directory tree, `.env.example`, `config.json`, all `__init__.py` | None | ✅ DONE |
| 02 | `02_models.md` | 10 SQLModel model files | 01 | ✅ DONE |
| 03 | `03_config_schemas_deps.md` | `config.py`, `schemas/`, `api/dependencies.py` | 01 | ✅ DONE |
| 04 | `04_routes_main.md` | 6 route files + `main.py` | 02, 03 | ✅ DONE |
| 05 | `05_agents.md` | `agents/base.py` + 4 agent files | 02, 03 | ✅ DONE |
| 06 | `06_services.md` | `services/maps.py`, `services/matching.py` | 02, 03 | ⏳ TODO |
| 07 | `07_tests.md` | `tests/conftest.py` + test stubs | 04, 05, 06 | ⏳ TODO |
| 08 | `08_seed.md` | `scripts/seed_mock_data.py` | 02 | ⏳ TODO |

## Total File Count

| Category | Count |
|---|---|
| Models | 10 |
| Schemas | 2 |
| Config & Deps | 2 |
| Routes | 6 |
| `main.py` | 1 |
| Agents | 5 (base + 4) |
| Services | 2 |
| Tests | 16 (conftest + 5 route + 4 agent + 2 service) |
| Scripts | 2 (`__init__.py` + seed) |
| `__init__.py` packages | ~8 |
| Config files | 2 (`.env.example`, `config.json`) |
| **Total** | **~56** |

## Skill Usage (Rule 5)

The project has three skills that **must be used** for their matching phases instead of writing code from scratch:

| Phase | Use this skill |
|---|---|
| 04 — Routes | `/add-endpoint` (scaffolds route + updates `docs/api_endpoints.md` + writes test stub) |
| 05 — Agents | `/scaffold-agent` (scaffolds agent + test file with `record_trace` assertion) |
| 08 — Seed | `/seed-mock-data` (generates the full Islamabad dataset) |

Invoke them via the Claude Code CLI before manually writing any file they cover.

## Next Up: Phase 06

```bash
cd backend
# Phase 06 — create services/maps.py and services/matching.py
# Phase 07 — create tests/ (run after 06 is done)
# Phase 08 — run /seed-mock-data skill to populate the DB
```

## Quick-Start Verification Commands

After each phase, run the appropriate check:

```bash
# After 01: confirm structure
ls backend/app/

# After 02: confirm models import
cd backend && uv run python -c "from app.models.user import User; print('ok')"

# After 03: confirm config loads
cd backend && uv run python -c "from app.config import settings; print(settings.database_url)"

# After 04: confirm FastAPI starts
cd backend && uv run uvicorn app.main:app --reload

# After 08: seed data
cd backend && uv run python -m scripts.seed_mock_data
```

## Rules to Keep in Mind (from `.agent/rules.md`)

| Rule | Requirement | Where it applies |
|---|---|---|
| R1 Zero-Assumption | Ask before architectural decisions not covered by the docs | Any deviation from these plan files |
| R2 Single Responsibility | One file, one purpose — never mix routes, models, or agent logic | All phases |
| R3 Mandatory Tests | A phase is NOT done until its tests are written and passing | Phases 02–08 |
| R4 No Secret Leaks | No hardcoded keys, URIs, or passwords — `.env` only | Phase 03, 05, 06 |
| R5 Prioritize Skills | Use `/add-endpoint`, `/scaffold-agent`, `/seed-mock-data` before writing manually | Phases 04, 05, 08 |
| R6 Strict Separation | All backend code stays inside `backend/` | All phases |
| R7 Update Docs | After any route change → update `docs/api_endpoints.md`. After any model change → update `docs/db_schema.md` | Phases 02, 04 |
