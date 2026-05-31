# Skillstack — FastAPI App

## Architecture

- **FastAPI** backend (async, lifespan events, no decorator-based startup/shutdown)
- **Vanilla JS SPA** — no framework. Single `templates/index.html` served at `/`
- **SQLite** via `aiosqlite` (WAL mode, `check_same_thread=False`)
- **ChromaDB** + `sentence-transformers/all-MiniLM-L6-v2` for semantic search
- **Ollama** (internal network) for AI features
- **Local network** for development access

## Key Files

- `main.py` — all API endpoints, DB init, Ollama helpers
- `search_engine.py` — ChromaDB embedding + search singleton
- `templates/index.html` — SPA (mirror of root index.html)
- `dashboard.db` — SQLite database (auto-created)

## Conventions

- All endpoints are `async def` using `aiosqlite` directly (no ORM)
- Pydantic models for request/response validation
- StreamingResponse for SSE endpoints (progress bars, search streaming)
- `asyncio.ensure_future()` for fire-and-forget ChromaDB indexing after note writes
- `_now()` returns UTC ISO timestamp
- `from search_engine import add_note/update_note/delete_note` for vector index sync

## Running Locally

```bash
# Recreate environment (if needed):
cd /home/rishi-reddy/my-project/skillstack/fastapi-app
uv sync

# Start the server:
.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8080
```

Port is configurable via `PORT` env var:
```bash
PORT=9090 .venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT
```

Health probes:
- `/live` — lightweight process liveness (orchestrator use)
- `/ready` — database connectivity check (returns 503 if degraded)

Tunnel: (optional — use for remote access)

## AI Models

- Text generation: `qwen3:8b` (notesheets, quizzes)
- Vision/OCR: `qwen2.5vl:7b` (PDF OCR fallback)
- PDF text extraction: `pdftotext` (poppler-utils), OCR fallback via Ollama vision
