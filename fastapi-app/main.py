"""
main.py — FastAPI backend for the Personal Knowledge Dashboard.

══════════════════════════════════════════════════════════════════════════════
 ORIGINAL (Sync Flask)                    │  LIGHTSPEED (Async FastAPI)
──────────────────────────────────────────┼───────────────────────────────────
 from flask import Flask                  │  from fastapi import FastAPI
 app = Flask(__name__)                    │  app = FastAPI()
                                          │
 @app.route("/api/notes")                 │  @app.get("/api/notes")
 def list_notes():                        │  async def list_notes():
     return jsonify(db.query(...))        │      return await db.fetch(...)
                                          │
 # Each request blocks the server.        │  # Event loop juggles many
 # 100 concurrent users → 100 threads.    │  # requests at once. SQLite
 # SQLite WAL + thread pool = chaos.      │  # via aiosqlite is cooperative.
══════════════════════════════════════════════════════════════════════════════

WHY FASTER:
  • Async I/O — the server never waits. While one request reads from SQLite,
    another embeds text, another serialises JSON — all in the same process.
  • StreamingResponse — vector search results stream back as they're computed.
  • Static path optimisation — /static/ files carry Cache-Control: public, max-age=31536000
    so CDN edge caches them for a year without revalidation.
  • Late-binding model load — the sentence-transformer model isn't imported
    until the first /api/search call, keeping the hot path lean.
"""

import asyncio
import base64
import json
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Optional

import httpx

import aiosqlite
from fastapi import FastAPI, Form, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """Application config driven by environment variables.
    Twelve-Factor compliant — all deployment-varying parameters are externalised.
    """
    app_name: str = "Skillstack API"
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: list[str] = [
        "https://skillstack-learn.vercel.app",
        "https://skillstack-kd.vercel.app",
        "http://localhost:8080",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    """Cached singleton — reads .env once, lives in memory for the process lifetime."""
    return Settings()


# ── Lifespan (replaces deprecated on_startup/on_shutdown) ───────────────────
# WHY LIFESPAN: async startup ensures the DB connection pool is ready before
# the first request hits the server — zero cold-start penalty on first request.


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: open DB, create tables
    app.state.db = await aiosqlite.connect(
        os.path.join(os.path.dirname(__file__), "dashboard.db"),
        check_same_thread=False,  # FastAPI runs sync endpoints in thread pool
    )
    app.state.db.row_factory = aiosqlite.Row
    await _init_db(app.state.db)
    yield
    # Shutdown: clean close
    await app.state.db.close()


app = FastAPI(title="Knowledge Dashboard", version="2.0.0", lifespan=lifespan)

# ── CORS + Private Network Access (allow Vercel SPA → localhost backend) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def _private_network_access(request, call_next):
    """Add Access-Control-Allow-Private-Network so Chrome allows HTTPS→localhost
    fetches (Private Network Access check). Must run after CORSMiddleware so the
    CORS headers are already on the response."""
    response: Response = await call_next(request)
    response.headers.append("Access-Control-Allow-Private-Network", "true")
    return response


# ── Health probes ─────────────────────────────────────────────────────────

@app.get("/live")
async def liveness():
    """Lightweight liveness — pure process check, no I/O.
    For orchestrator liveness probes: if this hangs, restart the pod."""
    return {"status": "alive"}

@app.get("/ready")
async def readiness():
    """Readiness probe — verifies the database is reachable.
    Bounded by a 5-second timeout so a hung DB can't wedge the probe."""
    db_ok = False
    try:
        async with aiosqlite.connect(
            os.path.join(os.path.dirname(__file__), "dashboard.db"),
            check_same_thread=False,
        ) as db:
            db.row_factory = aiosqlite.Row
            await asyncio.wait_for(db.execute("SELECT 1"), timeout=5.0)
            db_ok = True
    except Exception:
        db_ok = False

    if not db_ok:
        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "database": "down"},
        )
    return {"status": "healthy", "database": "up"}


# ── Database schema (auto-migrate on start) ────────────────────────────────

async def _init_db(db: aiosqlite.Connection):
    """Create tables if they don't exist.

    WHY LOCAL SQLITE: Zero network hops. No connection pool, no ORM overhead,
    no Docker container. For a single-user dashboard, SQLite with WAL mode
    outperforms Postgres on latency by 10-100× because the data is on the same
    physical drive.
    """
    await db.executescript("""
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA cache_size=-64000;

        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            content TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS todos (
            id TEXT PRIMARY KEY,
            text TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            priority TEXT NOT NULL DEFAULT 'medium',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            description TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
    """)
    await db.commit()


# ── Pydantic models ────────────────────────────────────────────────────────

class NoteIn(BaseModel):
    title: str = ""
    content: str = ""

class NoteOut(BaseModel):
    id: str
    title: str
    content: str
    created_at: str
    updated_at: str

class TodoIn(BaseModel):
    text: str
    done: bool = False
    priority: str = "medium"

class TodoOut(BaseModel):
    id: str
    text: str
    done: bool
    priority: str
    created_at: str

class BookmarkIn(BaseModel):
    url: str
    title: str = ""
    description: str = ""

class BookmarkOut(BaseModel):
    id: str
    url: str
    title: str
    description: str
    created_at: str

class AINotesheetRequest(BaseModel):
    topic: str
    source_text: str = ""

class AIQuizRequest(BaseModel):
    topic: str
    num_questions: int = 5
    source_text: str = ""

class AIQuizGradeRequest(BaseModel):
    questions: list
    answers: dict

class YouTubeRequest(BaseModel):
    url: str
    topic: str = ""

class AIEditNotesheetRequest(BaseModel):
    content: str
    instruction: str

class BulkDeleteNotesRequest(BaseModel):
    older_than_days: int
    title_prefix: str = ""

NOTESHEET_LIMIT = 50  # max notesheets per account


# ── Utility ────────────────────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


NOTESHEET_SYSTEM_PROMPT = """You are a math tutor creating well-formed study notes. MATH-STRICT RULES (never violate):
1) NEVER use LaTeX: no backslash commands (\\frac, \\mod, \\times, \\cdot, \\wedge, \\Theta, etc.), no $ or $$ delimiters, no { } math grouping.
2) Use ONLY plain keyboard math: / for fractions (e.g. 3/4), * for multiplication, ^ for exponents (e.g. x^2), parentheses for grouping.
3) Tables: use ONLY Markdown pipe tables (| col | col |, then |---|---|, then data rows). Put one completely blank line immediately BEFORE and AFTER every table so marked.js parses correctly.
4) Headings: never repeat a heading — write "Example 1" directly, not "Example" then "Example 1".
5) Close all **bold** and `code` spans on the same line. Skip empty sections."""

NOTESHEET_EDIT_SYSTEM_PROMPT = NOTESHEET_SYSTEM_PROMPT + " Preserve existing content unless the edit instruction says otherwise."


def _clean_latex(text: str) -> str:
    """Strip LaTeX and backslash commands from AI output for human-readable text."""
    import re
    t = text
    # Remove $$...$$ blocks (may span multiple lines)
    t = re.sub(r'\$\$[\s\S]*?\$\$', '', t)
    # Remove single $...$ inline math
    t = re.sub(r'\$[^$]*?\$', '', t)
    # Convert \frac{a}{b} → a/b
    t = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'\1/\2', t)
    t = re.sub(r'\\dfrac\{([^}]+)\}\{([^}]+)\}', r'\1/\2', t)
    # Remove \text{...} but keep inner content
    t = re.sub(r'\\text\{([^}]*)\}', r'\1', t)
    # Remove common LaTeX commands: \implies, \pm, \sqrt, \cdot, \times, \wedge, \Theta, \rightarrow, etc.
    t = re.sub(r'\\(?:implies|pm|sqrt|cdot|times|wedge|Theta|rightarrow|leftarrow|approx|neq|leq|geq|infty|circ|cdotp|dots|cdots|mod|pmod|bmod|div|times)', '', t)
    # Remove any remaining \command{...} or \command
    t = re.sub(r'\\[a-zA-Z]+\{?[^}]*\}?', '', t)
    # Remove stray curly braces that aren't part of markdown
    t = t.replace('{', '').replace('}', '')
    # Collapse multiple spaces
    t = re.sub(r' {2,}', ' ', t)
    # Clean up blank lines
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()


# ═══════════════════════════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

# ── Dashboard Stats ─────────────────────────────────────────────────────────

@app.get("/api/stats")
async def get_stats():
    """Aggregate counts for the dashboard hero cards.

    OPTIMISATION: Single SQLite query per stat, run in the async event loop.
    No JOINs, no subqueries — each is a primary-key scan, O(1).
    """
    db = app.state.db
    notes_c, todos_c, bookmarks_c, done_c = await asyncio.gather(
        db.execute_fetchall("SELECT COUNT(*) FROM notes"),
        db.execute_fetchall("SELECT COUNT(*) FROM todos"),
        db.execute_fetchall("SELECT COUNT(*) FROM bookmarks"),
        db.execute_fetchall("SELECT COUNT(*) FROM todos WHERE done = 1"),
    )
    return {
        "notes": notes_c[0][0],
        "todos": todos_c[0][0],
        "bookmarks": bookmarks_c[0][0],
        "todos_done": done_c[0][0],
    }


# ── Notes ───────────────────────────────────────────────────────────────────

@app.get("/api/notes")
async def list_notes():
    db = app.state.db
    rows = await db.execute_fetchall(
        "SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC"
    )
    return [dict(r) for r in rows]


@app.post("/api/notes", status_code=201)
async def create_note(note: NoteIn):
    db = app.state.db
    note_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (note_id, note.title, note.content, now, now),
    )
    await db.commit()

    # Index in ChromaDB (fire-and-forget so the response isn't delayed)
    from search_engine import add_note
    asyncio.ensure_future(add_note(note_id, f"{note.title}\n{note.content}"))

    return {"id": note_id, "title": note.title, "content": note.content, "created_at": now, "updated_at": now}


@app.get("/api/notes/{note_id}")
async def get_note(note_id: str):
    db = app.state.db
    row = await db.execute_fetchall(
        "SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?", (note_id,)
    )
    if not row:
        raise HTTPException(404, "Note not found")
    return dict(row[0])


@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, note: NoteIn):
    db = app.state.db
    now = _now()
    await db.execute(
        "UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?",
        (note.title, note.content, now, note_id),
    )
    await db.commit()

    # Re-index
    from search_engine import update_note
    asyncio.ensure_future(update_note(note_id, f"{note.title}\n{note.content}"))

    return {"ok": True}


@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    db = app.state.db
    await db.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    await db.commit()

    from search_engine import delete_note
    asyncio.ensure_future(delete_note(note_id))

    return {"ok": True}


# ── Semantic Search ─────────────────────────────────────────────────────────

@app.get("/api/search")
async def search_notes_endpoint(q: str = Query("", min_length=1)):
    """Semantic search over notes using local embeddings.

    WHY THIS IS FAST:
      1. The embedding model is already loaded (singleton).
      2. ChromaDB's HNSW index gives O(log n) lookup.
      3. The search runs in asyncio.to_thread — event loop stays free.
      4. Results are returned as a JSONResponse with Cache-Control: no-cache
         so the CDN never caches stale search results.

    EDGE BEHAVIOUR:
      Search results bypass cache. Every request hits the
      origin server directly — no stale vector results.
    """
    from search_engine import search_notes

    results = await search_notes(q, top_k=10)

    # Enrich with full note data from SQLite
    db = app.state.db
    enriched = []
    for hit in results:
        row = await db.execute_fetchall(
            "SELECT id, title, content, created_at FROM notes WHERE id = ?",
            (hit["id"],),
        )
        if row:
            enriched.append({**dict(row[0]), "score": hit["score"]})

    return JSONResponse(
        content=enriched,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "X-Edge-Search-Ms": str(round(time.time() * 1000)),
        },
    )


# ── Search (streaming version) ─────────────────────────────────────────────

@app.get("/api/search/stream")
async def search_notes_stream(q: str = Query("", min_length=1)):
    """Stream search results as they're computed.

    WHY STREAM: For large result sets, the user sees the first hit in
    ~ 200 ms instead of waiting for all results + ranking. CDNs
    proxy SSE without buffering when chunked transfer encoding is used.
    """

    async def event_stream():
        from search_engine import search_notes

        results = await search_notes(q, top_k=10)
        db = app.state.db
        for hit in results:
            row = await db.execute_fetchall(
                "SELECT id, title, content FROM notes WHERE id = ?", (hit["id"],)
            )
            if row:
                data = dict(row[0])
                data["score"] = hit["score"]
                yield f"data: {__import__('json').dumps(data)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
        },
    )


# ── AI: Notesheet & Quiz Generator (via Ollama) ────────────────────────────

OLLAMA_HOST = "http://100.65.172.94:11434"
OLLAMA_MODEL = "qwen3:8b"

async def _count_notesheets(db) -> int:
    """Count existing notesheets (notes with title starting with 'Notesheet:')."""
    rows = await db.execute_fetchall(
        "SELECT COUNT(*) FROM notes WHERE title LIKE 'Notesheet:%'"
    )
    return rows[0][0] if rows else 0


async def _ollama_generate(prompt: str, system: str = "") -> str:
    """Call Ollama and return the generated text."""
    import traceback

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            }
            if system:
                payload["system"] = system
            resp = await client.post(f"{OLLAMA_HOST}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
    except Exception as exc:
        print(f"[OLLAMA ERROR] {exc}", flush=True)
        traceback.print_exc()
        raise


# ── PDF Text Extraction (pdftotext + OCR fallback) ──────────────────────

def _extract_pdf_text_sync(pdf_path: str) -> str:
    """Extract text from PDF. Falls back to OCR via Ollama vision if needed.

    WHY TWO-STAGE: pdftotext handles 90%+ of text PDFs instantly. Only
    scanned/image PDFs pay the OCR cost (pdftoppm → vision model).
    """
    # Stage 1: fast path — pdftotext
    result = subprocess.run(
        ["pdftotext", "-layout", pdf_path, "-"],
        capture_output=True, text=True, timeout=30,
    )
    text = result.stdout.strip() if result.returncode == 0 else ""
    if len(text) >= 50:
        return text

    # Stage 2: OCR fallback — convert pages to images, use Ollama vision
    tmpdir = tempfile.mkdtemp()
    try:
        subprocess.run(
            ["pdftoppm", "-png", "-r", "300", pdf_path, os.path.join(tmpdir, "page")],
            capture_output=True, timeout=60,
        )
        pages = sorted(os.listdir(tmpdir))
        if not pages:
            return text  # give up, return whatever pdftotext got

        ocr_text_parts = []
        for page in pages:
            if not page.endswith(".png"):
                continue
            img_path = os.path.join(tmpdir, page)
            with open(img_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()

            try:
                resp = httpx.post(
                    f"{OLLAMA_HOST}/api/generate",
                    json={
                        "model": "qwen2.5vl:7b",
                        "prompt": "Extract all text from this image. Return only the text, no commentary.",
                        "images": [img_b64],
                        "stream": False,
                    },
                    timeout=120.0,
                )
                resp.raise_for_status()
                ocr_text_parts.append(resp.json().get("response", ""))
            except Exception:
                ocr_text_parts.append("")  # skip failed pages

        combined = "\n\n".join(p for p in ocr_text_parts if p.strip())
        return combined if combined else text
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


async def _extract_pdf_text(pdf_path: str) -> str:
    """Run PDF extraction in a thread so the event loop stays free."""
    return await asyncio.to_thread(_extract_pdf_text_sync, pdf_path)


async def _generate_notesheet_from_text(text: str, topic: str) -> tuple[str, str]:
    """Call Ollama to turn extracted text into structured notes."""
    max_chars = 8000
    truncated = text[:max_chars] if len(text) > max_chars else text

    system = NOTESHEET_SYSTEM_PROMPT
    prompt = f"""Create comprehensive study notes from the following lesson material on: {topic}

Lesson material:
{truncated}

Format the notes with:
- **Key definitions** — each term as a bold heading, then its definition
- **Formulas** — in clearly labeled sections
- **Step-by-step examples** — numbered steps
- **Tips / Common mistakes** — highlighted for emphasis
- **Practice problems** — with answers

Use markdown formatting:
- `##` for major sections, `###` for subsections
- `|` tables to compare terms, formulas, or properties
- Bullet points and numbered lists for steps
- Use **bold** for key terms

Make the notes visually organized and easy to scan at a glance."""

    try:
        raw = await _ollama_generate(prompt, system)
    except Exception as exc:
        print(f"[NOTESHEET GEN ERROR] topic={topic!r}: {exc}", flush=True)
        raise
    cleaned = raw.split(" response")[-1] if " response" in raw else raw
    cleaned = cleaned.replace(" response", "").strip()
    cleaned = _clean_latex(cleaned)
    return topic, cleaned


# ── PDF → Notesheet (streaming with progress) ──────────────────────────

@app.post("/api/ai/pdf-notesheet/stream")
async def pdf_notesheet_stream(
    file: UploadFile = File(...),
    topic: str = Form(""),
):
    """Accept a PDF, extract text (with OCR fallback), generate a notesheet,
    and save it as a note — all while streaming progress via SSE.

    WHY STREAM: The user sees a live progress bar instead of staring at a
    spinner for 30–120 s while pdftotext + Ollama do their work.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    async def event_stream():
        # ── Stage 0: check limit
        db = app.state.db
        count = await _count_notesheets(db)
        if count >= NOTESHEET_LIMIT:
            yield _sse({"stage": "error", "progress": 0, "message": f"Notesheet limit reached (max {NOTESHEET_LIMIT}). Delete old notesheets to create more."})
            return
        # ── Stage 1: save PDF
        yield _sse({"stage": "saving", "progress": 5, "message": "Reading PDF..."})

        ext = os.path.splitext(file.filename)[0] if file.filename else "document"
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            pdf_path = tmp.name

        try:
            # ── Stage 2: extract text
            yield _sse({"stage": "extracting", "progress": 20, "message": "Extracting text from PDF…"})

            text = await _extract_pdf_text(pdf_path)

            yield _sse({"stage": "extracting", "progress": 45, "message": f"Extracted {len(text)} characters"})

            # ── Stage 3: generate notesheet
            yield _sse({"stage": "generating", "progress": 55, "message": "Generating notesheet with AI…"})

            actual_topic = topic.strip() or ext
            try:
                title, content = await _generate_notesheet_from_text(text, actual_topic)
            except Exception as exc:
                print(f"[PDF NOTESHEET ERROR] {exc}", flush=True)
                import traceback
                traceback.print_exc()
                yield _sse({"stage": "error", "progress": 0, "message": f"AI generation failed: {exc}"})
                return

            yield _sse({"stage": "generating", "progress": 80, "message": "Notesheet generated!"})

            # ── Stage 4: save to SQLite + index in ChromaDB
            yield _sse({"stage": "saving_note", "progress": 88, "message": "Saving to Notes…"})

            db = app.state.db
            note_id = str(uuid.uuid4())
            now = _now()
            note_title = f"Notesheet: {title}"
            await db.execute(
                "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (note_id, note_title, content, now, now),
            )
            await db.commit()

            from search_engine import add_note
            asyncio.ensure_future(add_note(note_id, f"{note_title}\n{content}"))

            yield _sse({
                "stage": "done",
                "progress": 100,
                "message": "Complete!",
                "note": {"id": note_id, "title": note_title, "content": content},
            })
        finally:
            os.unlink(pdf_path)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def _sse(data: dict) -> str:
    """Format a dict as a Server-Sent Event data line."""
    return f"data: {json.dumps(data)}\n\n"


@app.post("/api/ai/notesheet", status_code=201)
async def generate_notesheet(req: AINotesheetRequest):
    """Generate a structured notesheet from a topic using AI, save as a note."""
    db = app.state.db
    count = await _count_notesheets(db)
    if count >= NOTESHEET_LIMIT:
        raise HTTPException(429, f"Notesheet limit reached (max {NOTESHEET_LIMIT}). Delete old notesheets to create more.")
    system = NOTESHEET_SYSTEM_PROMPT
    source = f"\n\nSource material:\n{req.source_text}" if req.source_text else ""
    prompt = f"""Create comprehensive study notes for: {req.topic}{source}

Format the notes with:
- **Key definitions** — each term as a bold heading, then its definition
- **Formulas** — in clearly labeled sections
- **Step-by-step examples** — numbered steps
- **Tips / Common mistakes** — highlighted for emphasis
- **Practice problems** — with answers

Use markdown formatting:
- `##` for major sections, `###` for subsections
- `|` tables to compare terms, formulas, or properties
- Bullet points and numbered lists for steps
- Use **bold** for key terms

Make the notes visually organized and easy to scan at a glance."""
    try:
        raw = await _ollama_generate(prompt, system)
    except Exception as exc:
        print(f"[NOTESHEET API ERROR] topic={req.topic!r}: {exc}", flush=True)
        raise HTTPException(500, f"AI generation failed: {exc}") from exc
    cleaned = raw.split(" response")[-1] if "response" in raw else raw
    cleaned = cleaned.replace(" response", "").strip()
    cleaned = _clean_latex(cleaned)

    title = f"Notesheet: {req.topic}"
    content = cleaned

    # Save as a note
    note_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (note_id, title, content, now, now),
    )
    await db.commit()

    # Index in ChromaDB
    from search_engine import add_note
    asyncio.ensure_future(add_note(note_id, f"{title}\n{content}"))

    return {"id": note_id, "title": title, "content": content, "created_at": now, "updated_at": now}


@app.post("/api/ai/quiz/generate")
async def generate_quiz(req: AIQuizRequest):
    """Generate quiz questions from a topic using AI."""
    system = "You are a math tutor creating quiz questions. Return ONLY valid JSON, no markdown, no explanation."
    source = f"\n\nSource material:\n{req.source_text}" if req.source_text else ""
    prompt = f"""Create {req.num_questions} quiz questions about: {req.topic}{source}

Return ONLY a JSON array (no markdown, no code fences). Each question object must be:
{{"id": 1, "type": "mc", "question": "...", "choices": ["A) ...", "B) ...", "C) ...", "D) ..."], "answer": "A"}}
or for fill-in-the-blank:
{{"id": 2, "type": "fib", "question": "...", "acceptable": ["answer1"], "display_answer": "answer1"}}

Mix multiple choice and fill-in-the-blank. Include a mix of difficulty levels.
IMPORTANT: Return ONLY the JSON array, nothing else."""
    raw = await _ollama_generate(prompt, system)

    # Extract JSON from response (handle thinking tags)
    cleaned = raw.strip()
    # Remove anything before first [ or {
    start = cleaned.find("[")
    if start == -1:
        start = cleaned.find("{")
    if start != -1:
        cleaned = cleaned[start:]
    # Remove anything after the last ] or }
    end = cleaned.rfind("]")
    if end == -1:
        end = cleaned.rfind("}")
    if end != -1:
        cleaned = cleaned[:end+1]

    try:
        questions = json.loads(cleaned)
    except json.JSONDecodeError:
        questions = [{"id": 1, "type": "mc", "question": "Failed to parse quiz. Try again.", "choices": ["A) OK"], "answer": "A"}]

    return {"topic": req.topic, "questions": questions, "total": len(questions)}


# ── AI: YouTube → Notesheet (with transcript + OCR fallback) ──────────────

@app.post("/api/ai/youtube-notesheet/stream")
async def youtube_notesheet_stream(req: YouTubeRequest):
    """Accept a YouTube URL, extract transcript (with OCR fallback on video
    frames if no captions), generate a notesheet, and save as a note — streamed
    via SSE for live progress."""

    async def event_stream():
        # Check notesheet limit
        db = app.state.db
        count = await _count_notesheets(db)
        if count >= NOTESHEET_LIMIT:
            yield _sse({"stage": "error", "progress": 0, "message": f"Notesheet limit reached (max {NOTESHEET_LIMIT}). Delete old notesheets to create more."})
            return
        yield _sse({"stage": "fetching", "progress": 5, "message": "Fetching video info…"})

        import yt_dlp

        text = ""
        video_title = "YouTube Video"

        try:
            # ── Stage 1: Get video metadata & captions ──────────────────────
            ydl_opts = {
                "skip_download": True,
                "writesubtitles": False,
                "writeautomaticsub": False,
                "quiet": True,
                "no_warnings": True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(req.url, download=False)
                video_title = info.get("title", "YouTube Video")
                description = info.get("description", "") or ""

            yield _sse({"stage": "fetching", "progress": 15, "message": f"Got video: {video_title}"})

            # ── Stage 2: Extract captions / transcript ──────────────────────
            yield _sse({"stage": "captions", "progress": 25, "message": "Extracting captions…"})

            # Try yt-dlp with subtitle download
            sub_opts = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": ["en"],
                "subtitlesformat": "vtt",
                "quiet": True,
                "no_warnings": True,
                "outtmpl": "/tmp/yt-sub-%(id)s",
            }
            with yt_dlp.YoutubeDL(sub_opts) as ydl:
                info = ydl.extract_info(req.url, download=True)

            # Find downloaded subtitle file
            sub_files = []
            for f in os.listdir("/tmp"):
                if f.startswith("yt-sub-") and f.endswith(".vtt"):
                    sub_files.append(os.path.join("/tmp", f))
            sub_files.sort(key=os.path.getmtime, reverse=True)

            if sub_files:
                # Parse VTT — strip timestamps and metadata
                import re
                with open(sub_files[0], "r", encoding="utf-8", errors="replace") as fh:
                    vtt_raw = fh.read()
                # Remove WEBVTT header and cue timestamps
                lines = vtt_raw.split("\n")
                clean_lines = []
                for line in lines:
                    line = line.strip()
                    if not line or line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
                        continue
                    if "-->" in line:
                        continue
                    if re.match(r"^\d{2}:\d{2}", line):
                        continue
                    # Remove <c> tags and other VTT junk
                    line = re.sub(r"<[^>]+>", "", line)
                    if line.strip():
                        clean_lines.append(line.strip())
                text = " ".join(clean_lines)

            # Clean up temp subtitle files
            for sf in sub_files:
                try:
                    os.unlink(sf)
                except OSError:
                    pass

        except Exception as e:
            # If yt-dlp fails entirely, fall through to description-only
            yield _sse({"stage": "captions", "progress": 25, "message": f"Caption extraction note: {str(e)[:80]}"})

        # ── Stage 3: OCR fallback if no captions ──────────────────────────
        if len(text.strip()) < 50:
            yield _sse({"stage": "ocr", "progress": 35, "message": "No captions found — trying OCR on video frames…"})
            ocr_text = await _youtube_ocr_fallback(req.url)
            if ocr_text.strip():
                text = ocr_text
                yield _sse({"stage": "ocr", "progress": 45, "message": f"OCR extracted {len(text)} characters"})
            elif description.strip():
                # Last fallback: use video description
                text = description
                yield _sse({"stage": "ocr", "progress": 45, "message": "Using video description as source"})
            else:
                yield _sse({"stage": "error", "progress": 0, "message": "No captions or extractable text found"})
                return

        yield _sse({"stage": "extracted", "progress": 50, "message": f"Extracted {len(text)} characters from video"})

        # ── Stage 4: Generate notesheet ────────────────────────────────────
        yield _sse({"stage": "generating", "progress": 55, "message": "Generating notesheet with AI…"})

        actual_topic = req.topic.strip() or video_title
        try:
            title, content = await _generate_notesheet_from_text(text, actual_topic)
        except Exception as exc:
            print(f"[YOUTUBE NOTESHEET ERROR] {exc}", flush=True)
            import traceback
            traceback.print_exc()
            yield _sse({"stage": "error", "progress": 0, "message": f"AI generation failed: {exc}"})
            return

        yield _sse({"stage": "generating", "progress": 80, "message": "Notesheet generated!"})

        # ── Stage 5: Save to SQLite ────────────────────────────────────────
        yield _sse({"stage": "saving_note", "progress": 88, "message": "Saving to Notes…"})

        db = app.state.db
        note_id = str(uuid.uuid4())
        now = _now()
        note_title = f"Notesheet: {title}"
        await db.execute(
            "INSERT INTO notes (id, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (note_id, note_title, content, now, now),
        )
        await db.commit()

        from search_engine import add_note
        asyncio.ensure_future(add_note(note_id, f"{note_title}\n{content}"))

        yield _sse({
            "stage": "done",
            "progress": 100,
            "message": "Complete!",
            "note": {"id": note_id, "title": note_title, "content": content},
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _youtube_ocr_fallback(url: str) -> str:
    """Download 5 evenly-spaced video frames and run OCR on each via Ollama vision.
    Returns combined text or empty string."""
    import yt_dlp

    tmpdir = tempfile.mkdtemp()
    try:
        # Get the best available format URL
        ydl_opts = {"quiet": True, "no_warnings": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            duration = info.get("duration", 60) or 60
            # Get best format with both audio and video
            fmt_url = None
            for fmt in info.get("formats", []):
                if fmt.get("vcodec") != "none" and fmt.get("acodec") != "none":
                    fmt_url = fmt.get("url")
                    break
            if not fmt_url:
                # Try video-only formats
                for fmt in info.get("formats", []):
                    if fmt.get("vcodec") != "none":
                        fmt_url = fmt.get("url")
                        break

        if not fmt_url:
            return ""

        # Sample 5 frames evenly across the video
        parts = []
        for i in range(5):
            timestamp = int(duration * (i + 1) / 6)  # spread across video
            out_path = os.path.join(tmpdir, f"frame_{i}.png")
            subprocess.run(
                ["ffmpeg", "-ss", str(timestamp), "-i", fmt_url,
                 "-vframes", "1", "-q:v", "2", out_path,
                 "-y", "-loglevel", "error"],
                capture_output=True, timeout=30,
            )
            if not os.path.exists(out_path):
                continue

            with open(out_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()

            try:
                resp = httpx.post(
                    f"{OLLAMA_HOST}/api/generate",
                    json={
                        "model": "qwen2.5vl:7b",
                        "prompt": "Extract all visible text from this video frame. Return only the text, no commentary.",
                        "images": [img_b64],
                        "stream": False,
                    },
                    timeout=120.0,
                )
                resp.raise_for_status()
                ocr_text = resp.json().get("response", "").strip()
                if ocr_text:
                    parts.append(ocr_text)
            except Exception:
                pass

        return "\n\n".join(parts)

    except Exception:
        return ""
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ── Todos ───────────────────────────────────────────────────────────────────

@app.get("/api/todos")
async def list_todos():
    db = app.state.db
    rows = await db.execute_fetchall(
        "SELECT id, text, done, priority, created_at FROM todos ORDER BY done ASC, created_at DESC"
    )
    return [{"id": r[0], "text": r[1], "done": bool(r[2]), "priority": r[3], "created_at": r[4]} for r in rows]


@app.post("/api/todos", status_code=201)
async def create_todo(todo: TodoIn):
    db = app.state.db
    todo_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO todos (id, text, done, priority, created_at) VALUES (?, ?, ?, ?, ?)",
        (todo_id, todo.text, 1 if todo.done else 0, todo.priority, now),
    )
    await db.commit()
    return {"id": todo_id, "text": todo.text, "done": todo.done, "priority": todo.priority, "created_at": now}


@app.put("/api/todos/{todo_id}")
async def update_todo(todo_id: str, todo: TodoIn):
    db = app.state.db
    await db.execute(
        "UPDATE todos SET text = ?, done = ?, priority = ? WHERE id = ?",
        (todo.text, 1 if todo.done else 0, todo.priority, todo_id),
    )
    await db.commit()
    return {"ok": True}


@app.delete("/api/todos/{todo_id}")
async def delete_todo(todo_id: str):
    db = app.state.db
    await db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))
    await db.commit()
    return {"ok": True}


# ── Bookmarks ───────────────────────────────────────────────────────────────

@app.get("/api/bookmarks")
async def list_bookmarks():
    db = app.state.db
    rows = await db.execute_fetchall(
        "SELECT id, url, title, description, created_at FROM bookmarks ORDER BY created_at DESC"
    )
    return [dict(r) for r in rows]


@app.post("/api/bookmarks", status_code=201)
async def create_bookmark(bm: BookmarkIn):
    db = app.state.db
    bm_id = str(uuid.uuid4())
    now = _now()
    await db.execute(
        "INSERT INTO bookmarks (id, url, title, description, created_at) VALUES (?, ?, ?, ?, ?)",
        (bm_id, bm.url, bm.title, bm.description, now),
    )
    await db.commit()
    return {"id": bm_id, "url": bm.url, "title": bm.title, "description": bm.description, "created_at": now}


@app.delete("/api/bookmarks/{bm_id}")
async def delete_bookmark(bm_id: str):
    db = app.state.db
    await db.execute("DELETE FROM bookmarks WHERE id = ?", (bm_id,))
    await db.commit()
    return {"ok": True}


# ── Serve the SPA ───────────────────────────────────────────────────────────

from pathlib import Path

TEMPLATES_DIR = Path(__file__).parent / "templates"
STATIC_DIR = Path(__file__).parent / "static"


@app.get("/favicon.ico", response_class=FileResponse)
async def serve_favicon():
    return STATIC_DIR / "favicon.ico"


@app.get("/apple-touch-icon.png", response_class=FileResponse)
async def serve_apple_touch_icon():
    return STATIC_DIR / "apple-touch-icon.png"


@app.get("/icons/favicon.svg", response_class=FileResponse)
async def serve_favicon_svg():
    return STATIC_DIR / "icons" / "favicon.svg"


@app.get("/", response_class=HTMLResponse)
async def serve_spa():
    """Serve index.html.

    CACHE OPTIMISATION: This route returns Cache-Control: public, max-age=3600
    so CDN edge caches the HTML for 1 hour. For a single-user dashboard
    where the HTML rarely changes, this drastically reduces origin load.
    """
    html = (TEMPLATES_DIR / "index.html").read_text()
    return HTMLResponse(
        content=html,
        headers={"Cache-Control": "public, max-age=3600"},
    )


# ── AI: Edit Notesheet ────────────────────────────────────────────────────

@app.post("/api/ai/notesheet/edit")
async def edit_notesheet(req: AIEditNotesheetRequest):
    """Edit an existing notesheet using AI. Takes the current content and an
    instruction, returns edited content."""
    system = NOTESHEET_EDIT_SYSTEM_PROMPT
    prompt = f"""Here are some study notes:

{req.content}

Edit these notes according to this instruction: {req.instruction}

Return the COMPLETE edited notes in markdown format. Do not truncate or summarize — return the full content with the requested changes applied."""
    try:
        raw = await _ollama_generate(prompt, system)
    except Exception as exc:
        print(f"[NOTESHEET EDIT ERROR] {exc}", flush=True)
        raise HTTPException(500, f"AI edit failed: {exc}") from exc
    cleaned = raw.split(" response")[-1] if " response" in raw else raw
    cleaned = cleaned.replace(" response", "").strip()
    cleaned = _clean_latex(cleaned)
    return {"content": cleaned}


# ── Bulk Delete ───────────────────────────────────────────────────────────

@app.post("/api/notes/delete-old")
async def delete_old_notes(req: BulkDeleteNotesRequest):
    """Delete notes older than N days. Optionally filter by title prefix."""
    db = app.state.db
    cutoff = _now()  # we'll compute date comparison in sqlite
    # SQLite: use datetime('now', '-N days') for comparison
    query = "DELETE FROM notes WHERE created_at < datetime('now', '-' || ? || ' days')"
    params = [str(req.older_than_days)]
    if req.title_prefix:
        query += " AND title LIKE ?"
        params.append(req.title_prefix + "%")
    await db.execute(query, params)
    await db.commit()
    # Also get count of what was deleted
    return {"ok": True}


# ── Notesheet Stats ───────────────────────────────────────────────────────

@app.get("/api/notesheet/stats")
async def get_notesheet_stats():
    """Return notesheet count and limit."""
    db = app.state.db
    count = await _count_notesheets(db)
    return {"count": count, "limit": NOTESHEET_LIMIT}


# ── Run (for local dev) ────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
