# Knowledge Dashboard — FastAPI App

## Architecture

- **FastAPI** backend (async, lifespan events, no decorator-based startup/shutdown)
- **Vanilla JS SPA** — no framework. Single `templates/index.html` served at `/`
- **SQLite** via `aiosqlite` (WAL mode, `check_same_thread=False`)
- **ChromaDB** + `sentence-transformers/all-MiniLM-L6-v2` for semantic search
- **Ollama** at `100.65.172.94:11434` for AI features
- **Cloudflare Tunnel** for remote access (quick tunnel via `cloudflared tunnel --url`)

## Key Files

- `main.py` — all API endpoints, DB init, Ollama helpers
- `search_engine.py` — ChromaDB embedding + search singleton
- `templates/index.html` — SPA (mirror of deployed Cloudflare Pages version)
- `/home/rishi-reddy/my-project/spain-czechrepublic-2016.com/index.html` — deployed Pages SPA (keep in sync)
- `dashboard.db` — SQLite database (auto-created)

## Conventions

- All endpoints are `async def` using `aiosqlite` directly (no ORM)
- Pydantic models for request/response validation
- StreamingResponse for SSE endpoints (progress bars, search streaming)
- `asyncio.ensure_future()` for fire-and-forget ChromaDB indexing after note writes
- `_now()` returns UTC ISO timestamp
- `from search_engine import add_note/update_note/delete_note` for vector index sync

## Deployed SPA

The Cloudflare Pages site is at `knowledge-dashboard-3ya.pages.dev`. When editing the SPA:
1. Edit `/home/rishi-reddy/my-project/spain-czechrepublic-2016.com/index.html`
2. Copy to `templates/index.html` for local dev
3. `wrangler pages deploy` or git push triggers auto-deploy

## Running Locally

```bash
cd /home/rishi-reddy/my-project/knowledge-dashboard/fastapi-app
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

Tunnel: `cloudflared tunnel --config /dev/null --url http://localhost:8000`

## AI Models

- Text generation: `qwen3:8b` (notesheets, quizzes)
- Vision/OCR: `qwen2.5vl:7b` (PDF OCR fallback)
- PDF text extraction: `pdftotext` (poppler-utils), OCR fallback via Ollama vision
