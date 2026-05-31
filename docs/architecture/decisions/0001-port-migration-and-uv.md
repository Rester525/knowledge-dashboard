# ADR 0001: Port Migration and uv Toolchain Adoption

**Date:** 2026-05-30

## Context

The project was relocated from `~/my-project/knowledge-dashboard/` to
`~/my-project/skillstack/`, breaking the Python virtual environment: all
scripts in `venv/bin/` contained hardcoded absolute shebangs pointing to the
old filesystem path.

Simultaneously, port `8000` was found to be occupied by a secondary process
(workspace-mcp), preventing the FastAPI server from starting on its
conventionally configured port.

## Decision

### 1. Migrate from `venv` + `pip` to `uv`

- Replace `requirements.txt` with `pyproject.toml` + `uv.lock` for
  deterministic, cryptographically hashed dependency management.
- Virtual environments are treated as **ephemeral artifacts** — never moved or
  patched; always recreated via `uv sync`.
- `uv` installs dependencies 10-100x faster than `pip`, making the recreate
  penalty negligible.

### 2. Dynamic port configuration via `pydantic-settings`

- A `Settings` class (backed by `BaseSettings`) reads `$PORT` from the
  environment, falling back to `8080`.
- The same class drives CORS origins, making future port changes a single
  config entry rather than a code change.
- All Twelve-Factor App compliant: configuration is externalised from code.

### 3. Port 8080 as the default

- FastAPI now runs on `8080` by default (was `8000`).
- CORS origins, frontend fallback, and all documentation updated to match.
- The `PORT` env var overrides this for CI/CD or conflict scenarios.

### 4. Health probe endpoints

- `GET /live` — process-level liveness (no I/O, for orchestrators).
- `GET /ready` — database connectivity check with 5-second timeout; returns
  503 if degraded.

## Consequences

- **Positive:** Deterministic builds — `uv sync` produces identical
  environments across machines.
- **Positive:** No more shebang breakage on directory moves.
- **Positive:** Port changes require only a `.env` or `$PORT` override, not
  code edits.
- **Positive:** Container orchestration (Docker Compose, Kubernetes) can use
  `/live` and `/ready` probes directly.
- **Negative:** `uv` is an additional tool dependency (not in standard
  library). Developers need `pip install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`.
- **Negative:** `requirements.txt` is no longer the primary manifest; future
  devs must update `pyproject.toml` instead.
