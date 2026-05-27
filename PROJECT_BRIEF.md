# Skillstack — Complete Project Reference

> Use this document to give an AI (Gemini, Claude, etc.) full context about the project. Copy-paste the relevant sections when asking for implementation help.
>
> **⚠️ No secrets in this file.** API keys, client secrets, service keys, and tokens are never included — they're referenced as env variables or redacted. The Supabase anon key and project ref are public (embedded in the frontend code) and safe to share.

---

## 1. Project Overview

A single-page vanilla JS knowledge management dashboard — notes, todos, bookmarks, calculator, study timer with AI notesheet generation, search, settings. Has multiple backend implementations.

**Live URLs:**
- SPA (Vercel): https://skillstack-learn.vercel.app
- FastAPI Backend: localhost:8000
- Next.js App: https://next-app-weld-eight.vercel.app

**GitHub:** `Rester525/knowledge-dashboard`

---

## 2. Architecture

### 2.1 Frontend (SPA)

**Single file:** `index.html` at repo root (~5500 lines). All CSS and JS inline in one `<script>` block. No framework.

**Key libraries (CDN):**
- **Tailwind CSS** — `cdn.tailwindcss.com` for utility CSS classes
- **idb-keyval** — IndexedDB wrapper for local/guest mode data storage
- **Supabase JS** — `@supabase/supabase-js` for cloud auth + database CRUD
- **html2pdf.js** (v0.10.1) — client-side PDF generation from HTML
- **Google Identity Services (GIS)** — OAuth for Google Drive API access

**Mirror copies:** The SPA source is mirrored to:
1. `index.html` (repo root — deployed on Vercel)
2. `fastapi-app/templates/index.html` (served by local FastAPI)

### 2.2 Backend Options

Three backend implementations exist:

| Backend | Language/Framework | Database | AI | Status |
|---------|-------------------|----------|-----|--------|
| **FastAPI** | Python, FastAPI | SQLite (aiosqlite) | Ollama (qwen3:8b) | Primary local backend |
| **Next.js** | TypeScript, Next.js 16 | Neon Postgres | OpenAI | Separate deployment |
| **Supabase REST** | Supabase (PaaS) | PostgreSQL 17 | N/A | Used by cloud-mode users |

### 2.3 Data Flow

```
User → SPA (index.html) → API Router (api() function)
                             ├── Cloud user? → Supabase REST API
                             └── Guest user?  → FastAPI backend (localhost)
                                  └── FastAPI → SQLite (aiosqlite)
                                              → ChromaDB (vector search)
                                              → Ollama (AI generation)
```

**Guest mode:** All CRUD goes through IndexedDB first (local-first), then syncs to FastAPI backend.
**Cloud mode:** All CRUD routes through Supabase REST API with RLS policies. IndexedDB used as offline cache.

---

## 3. Services & How They're Used

### 3.1 Supabase
- **Project ref:** `iwkbuurltlnaszptrgth` (public — embedded in frontend code), region: `us-west-1`, free plan
- **URL:** `https://[project-ref].supabase.co`
- **Auth:** Email/password authentication with confirmation email
- **Database:** PostgreSQL 17 with tables: `notes`, `todos`, `bookmarks`
  - Each table has: `id UUID PK`, `user_id UUID FK (auth.users)`, `title TEXT`, `content TEXT`, `tags TEXT[]`, `done BOOLEAN`, `url TEXT`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
  - RLS policies enforce `auth.uid() = user_id` on every table
- **SPA integration:** Supabase client created via `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`. Anon key is safe to expose (RLS enforces auth). Auth state managed via `onAuthStateChange` listener.
- **Cloud CRUD pattern:** Local-first (IndexedDB save) → Supabase REST API (`/rest/v1/{entity}`). Offline sync queue replays pending operations.
- **Schema:** `schema.sql` in repo root — idempotent migration file.

### 3.2 Vercel (SPA Deployment)
- **Deployed URL:** `https://skillstack-learn.vercel.app`
- **Config:** `vercel.json` with SPA rewrites (`"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`)
- **Build:** `vercel.json` triggers `vite build` via `@vitejs/plugin-legacy` to bundle `index.html`
- **Deployment:** `npx vercel deploy --prod` from repo root, or git push to main triggers auto-deploy
- **GitHub repo:** `Rester525/knowledge-dashboard`

### 3.3 FastAPI (Local Backend)
- **Location:** `fastapi-app/main.py`
- **Server:** `uvicorn main:app --host 0.0.0.0 --port 8000`
- **Database:** SQLite via `aiosqlite` (WAL mode, `check_same_thread=False`)
  - Same schema as Supabase (`notes`, `todos`, `bookmarks` tables)
  - Auto-created at `fastapi-app/dashboard.db`
- **Vector search:** ChromaDB + `sentence-transformers/all-MiniLM-L6-v2`
  - Auto-indexed on note create/update/delete via `asyncio.ensure_future()`
  - Search endpoint: `POST /api/search?q=query` returns streaming SSE results
- **AI endpoints:**
  - `POST /api/ai/notesheet` — Generate study notesheet from text input
  - `POST /api/ai/notesheet/pdf` — Generate notesheet from uploaded PDF
  - `POST /api/ai/notesheet/youtube` — Generate notesheet from YouTube URL
  - `POST /api/ai/quiz` — Generate quiz questions
  - `POST /api/ai/notesheet/edit` — Edit existing notesheet via AI instruction
  - `POST /api/ai/explain` — Explain a concept
  - `POST /api/ai/flashcards` — Generate flashcards
- **CRUD endpoints:** Standard REST for `/api/notes`, `/api/todos`, `/api/bookmarks`
- **Bulk delete:** `POST /api/notes/delete-old` accepts `{older_than_days, title_prefix?}`
- **Stats:** `GET /api/stats`, `GET /api/notesheet/stats`
- **CORS:** Wide open for development

### 3.4 Ollama (AI)
- **Host:** Internal network address (set via `OLLAMA_BASE` env var in FastAPI)
- **Models:**
  - `qwen3:8b` — Primary model for notesheet generation, quiz generation, AI editing, explanations
  - `qwen2.5vl:7b` — Vision/OCR model for PDF text extraction fallback
- **Used by:** FastAPI backend for all AI features

### 3.5 Google Identity Services (Drive API)
- **Client ID:** Set via environment variable (not included in repo)
- **Purpose:** Save notesheets directly to Google Drive as Google Docs
- **Flow:** GIS token client → `requestAccessToken()` → Drive API files.create
- **Fallback:** If OAuth fails or times out (8s timeout), downloads HTML file instead
- **Script:** Dynamically loaded from `https://accounts.google.com/gsi/client`

### 3.6 ChromaDB (Vector Search)
- **Collection:** `knowledge_notes` with `sentence-transformers/all-MiniLM-L6-v2` embeddings
- **Purpose:** Semantic search across notes (not just keyword match)
- **Sync:** Fire-and-forget on note CRUD operations
- **Location:** `fastapi-app/search_engine.py`

---

## 4. SPA Features

### 4.1 Views (7 total, navigable via sidebar or Ctrl+1 through Ctrl+7)

| # | View | Keyboard | Key Features |
|---|------|----------|--------------|
| 1 | Dashboard | Ctrl+1 | Stats overview (notes, todos, bookmarks count, completion rate) |
| 2 | Notes | Ctrl+2 | Full CRUD, inline search, Delete All |
| 3 | Todos | Ctrl+3 | CRUD with Kanban toggle (list/grid view) |
| 4 | Bookmarks | Ctrl+4 | CRUD with URL links |
| 5 | Calculator | Ctrl+5 | Desmos-style graphing calculator with presets (27 presets) |
| 6 | Study | Ctrl+6 | Notesheet generation, Quiz, Timer (Pomodoro 25/5), Saved Notesheets |
| 7 | Settings | Ctrl+7 | Theme, accent colors, backgrounds, export/import, account, backend config |

### 4.2 Theme System
- **Themes:** Standard (default), Retro (`.theme-retro`), 8-Bit (`.theme-8bit`)
- **Accent colors:** 10 colors — blue, green, purple, amber, rose, red, orange, teal, cyan, indigo
- **Backgrounds:** Solid, Gradient, Glass (`.bg-glass`), Synthwave (`.bg-synthwave`)
- **Storage:** All persisted in `localStorage('kd-theme')`, `localStorage('kd-accent')`, `localStorage('kd-background')`

### 4.3 Auth System
- **Three modes:** Sign In (existing user), Create Account (new user), Guest/Offline (local only)
- **Login overlay:** Modal with email/password forms, mode switching
- **Cloud mode:** Uses Supabase Auth session, routes CRUD to Supabase REST API
- **Guest mode:** Uses IndexedDB for all storage, routes CRUD to FastAPI backend
- **Persistence:** `localStorage('kd-auth')` = `'cloud'` or `'guest'`

### 4.4 Notesheet System
- **Generation:** Text input, PDF upload, or YouTube URL → Ollama generates structured markdown
- **Storage:** Saved as regular notes with `"Notesheet: "` title prefix
- **Display:** Rendered HTML via `renderNotesheet()` function (not raw markdown)
- **Saved Notesheets tab:** Lists all notesheets, click to view with export buttons
- **Grid/List toggle:** Switch between grid and list view for saved notesheets
- **AI editing:** Edit saved notesheets with natural language instructions
- **PDF export:** Client-side via html2pdf.js
- **Google Drive export:** OAuth → Drive API → creates Google Doc
- **Limit:** 50 notesheets per account (`NOTESHEET_LIMIT` in FastAPI)

### 4.5 Special Features
- **Command palette:** Ctrl+K opens searchable command menu
- **Sync queue:** Offline changes queued and replayed when online
- **Bookmark bar:** Quick-access bar in sidebar
- **Data export/import:** Full JSON export/import in Settings
- **Mass delete notesheets:** Age-based bulk delete in Saved Notesheets tab

---

## 5. Testing

### 5.1 Test Files

```bash
node kd-test.mjs              # Core tests (26) — navigation, UI, keyboard, calculator, timer
node kd-features.mjs          # Feature tests (15) — settings, themes, backgrounds, auth overlay
node screenshot-test.mjs      # Screenshot capture (13) — auth flows, themes, backgrounds, accents
node test-full.mjs            # Full CRUD tests
node test-pdf-notesheet.mjs   # PDF notesheet test (requires local backend)
node test-vercel-pdf.mjs      # PDF notesheet test via Vercel → tunnel
node test-downloads.mjs       # PDF + Drive export tests
```

### 5.2 Test Setup
- **Framework:** Playwright (headless Chromium)
- **Auth bypass:** `localStorage.setItem('kd-auth', 'guest')` via `context.addInitScript()`
- **Viewport:** 1280x800

---

## 6. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1-7 | Navigate to view 1-7 |
| Ctrl+K | Open command palette |
| Ctrl+F | Navigate to Notes + focus search |
| Escape | Close palette/login overlay |

---

## 7. File Map

```
knowledge-dashboard/
├── index.html                     # SPA (single file, ~5500 lines)
├── CLAUDE.md                      # Project state & context
├── PROJECT_BRIEF.md              # THIS FILE — comprehensive reference
├── vercel.json                    # SPA rewrites config
├── vite.config.js                 # Vite build config
├── sw.js                          # Service worker (offline caching)
├── schema.sql                     # Supabase schema migration
├── package.json                   # Dependencies for Vite
├── kd-test.mjs                    # Core E2E tests
├── kd-features.mjs               # Feature tests
├── screenshot-test.mjs            # Screenshot capture
├── test-full.mjs                  # Full CRUD tests
├── test-pdf-notesheet.mjs         # PDF notesheet tests
├── test-vercel-pdf.mjs            # Vercel PDF tests
├── test-downloads.mjs             # Export tests
│
├── fastapi-app/                   # FastAPI backend
│   ├── main.py                    # All API endpoints (~600 lines)
│   ├── search_engine.py           # ChromaDB vector search
│   ├── dashboard.db               # SQLite database (auto-created)
│   ├── templates/index.html       # Mirror of root index.html
│   └── CLAUDE.md                  # FastAPI-specific context
│
├── next-app/                      # Next.js 16 backend (separate deployment)
│   ├── src/app/api/               # API routes (notes, todos, bookmarks, auth, etc.)
│   └── CLAUDE.md                  # Next.js-specific context
│
```

---

## 8. Other Projects in Workspace

| Project | Location | Description |
|---------|----------|-------------|
| **FastAPI Backend** | `~/my-project/knowledge-dashboard/fastapi-app/` | Python/FastAPI with SQLite + Ollama |
| **Next.js App** | `~/my-project/knowledge-dashboard/next-app/` | Next.js 16 + Neon Postgres + OpenAI |
| **Email Scanner** | `~/my-project/email_scanner/` | FastAPI app for scanning Gmail via API |
| **Express/Auth0 App** | (external repo) | Node.js/Express + Auth0 + EJS — deployed at skillstack.vercel.app (BROKEN: missing vercel.json, serving raw app.js) |
| **React App** | `~/my-project/web/` | Vite + React + Tailwind + KaTeX |
| **Game Server** | `~/my-project/server/` | FastAPI game engine (Shadow of the Forsaken Tower) |
| **MCP Servers** | `~/my-project/vercel_mcp_server.py` | Custom Vercel MCP server |

---

## 9. Common Operations

```bash
# Deploy SPA to Vercel
cd ~/my-project/knowledge-dashboard
npx vercel deploy --prod

# Run FastAPI backend locally
cd ~/my-project/knowledge-dashboard/fastapi-app
venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

# (no tunnel needed — runs on localhost:8000)

# Run tests
cd ~/my-project/knowledge-dashboard
node kd-test.mjs

# Mirror SPA changes (after editing root index.html)
cp index.html fastapi-app/templates/index.html

# Run Supabase schema migration
npx supabase db query --linked --file schema.sql
```

---

## 10. Quick Fixes & Known Issues

- **Google Drive OAuth timeout in Playwright:** 8s timeout added around `requestDriveToken()`. Falls back to HTML download.
- **Notesheet limit reached:** 50 notesheets max. Clear via Settings → Data Management or Saved Notesheets → Mass Delete.
- **Vercel not serving SPA:** Ensure `vercel.json` has SPA rewrites. `"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]`
- **Express app on Vercel needs `vercel.json`:** Must configure `@vercel/node` builder, otherwise app.js is served as static file.

---

## 11. Security Notes

- **Supabase anon key:** Public — safe to expose in frontend code. RLS policies enforce per-user auth. **Service key is never committed.**
- **Ollama:** Internal network only. Not exposed publicly.
- **Secrets management:** All API keys, client secrets, and tokens are stored in environment variables or `~/.claude.json`. Never in the codebase.
- **Don't commit:** `.env` files, `credentials.json`, service account keys, or any file containing `secret`, `key`, or `token` values.
