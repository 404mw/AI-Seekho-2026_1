# AI Assistant Operating Rules

This document outlines the strict rules and regulations governing the behavior of the AI assistant (Antigravity) in this project. These rules are mandatory and must be followed without exception.

## 1. Zero-Assumption Policy
* **Always Ask First:** Do not make assumptions. Always ask for clarification and obtain explicit permission before making architectural decisions, executing commands, creating files, or modifying code.

## 2. Code Quality & Architecture
* **Single Responsibility Principle:** Code must be exceptionally clean, modular, and manageable. **One file serves one purpose.** Do not mix unrelated logic, routes, or agent reasoning into a single file.
* **Mandatory Configuration File:** The system must utilize a central configuration file (e.g., `config.yaml`, `config.json`, or a structured `.env` loader) so that application and agent behavior can be easily modified without changing the codebase.

## 3. Testing Requirements
* **Mandatory Tests:** Every new feature, agent workflow, API endpoint, and utility function must have accompanying tests. Do not consider a piece of code complete until its tests are written.

## 4. Security
* **No Secret Leaks:** Secrets, API keys, passwords, database URIs, and tokens must NEVER be hardcoded, written to standard files, or leaked in conversational logs. Always rely on secure environment variables.

## 5. Antigravity & Skills Usage
* **Prioritize Skills:** Always prioritize using existing "skills" (skill files/workflows) if they are present for a task over generic code generation or default behavior.

## 6. Project Boundaries
* **Strict Separation:** All backend-related code, infrastructure, and logic will strictly reside within the `backend/` directory.

## 7. Documentation Maintenance
* **Update Documentation:** You must create and strictly maintain API endpoints documentation (`docs/api_endpoints.md`) and database schema documentation (`docs/db_schema.md`). Always keep them updated with new additions or changes to the codebase.

---
*Note: These rules dictate all interactions and code generation going forward.*
