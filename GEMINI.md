# Antigravity Hackathon - AI Assistant Working State

## Current Codebase Status
The project is currently in the initial setup phase.
- **Root Directory**: `g:\Hackathons\Google_Antigravity_hackathon`
- **Backend Directory**: `backend/` has been initialized with `uv`.
- **Dependencies Installed**: `fastapi`, `sqlmodel`, `google-genai` (for the agent workflows), and testing utilities (`pytest`, `httpx`, `pytest-asyncio`).

## Architectural Deviations & Missing Components
Based on `docs/architecture.md`, the current codebase is missing the planned structure:
1. `backend/main.py` is currently at the root of `backend/` instead of inside `backend/app/`.
2. The `backend/app/` package structure (`api/`, `agents/`, `services/`, `models/`, `schemas/`) has not been created yet.
3. The `backend/tests/` directory is missing.
4. `config.json` and `.env.example` have not been created.

## Next Immediate Steps for the Assistant
When the user is ready to proceed, prioritize the following tasks:
1. **Directory Restructuring**: Move `backend/main.py` to `backend/app/main.py` and scaffold the `app/` and `tests/` directories.
2. **Configuration Setup**: Create `config.json` and `.env.example` to enforce the "Configuration Driven" and "Security First" rules.
3. **Agent Scaffolding**: Create the base stubs for `intent.py`, `discovery.py`, `decision.py`, and `booking.py` in `app/agents/`.

## Rules and Skills Location
- **Operating Rules**: All strict operating rules for the AI assistant, including documentation maintenance, are located in `.agent/rules.md`. Ensure you follow them at all times.
- **Skills**: Assistant skills and automated workflows are located in the `.agent/skills/` directory.
