# Skillstack

> **IMPORTANT**: This file is the single source of truth for project state and survives conversation compression. Keep it current — particularly the "What Still Needs to Happen" and "Current Session Context" sections. After every significant change, update this file so the next session picks up without asking for status.
>
> **DEPLOY RULE**: After every code change, deploy to Vercel via `npx vercel --prod`. Commit and push to GitHub first — Vercel deploys from the git repo, not local files. Verify with `curl -s -o /dev/null -w "%{http_code}" https://skillstack-learn.vercel.app/`.

Single-page vanilla JS knowledge management app — notes, todos, bookmarks, calculator, study timer, search, settings. Deployed on Vercel.

## Architecture

- **Single file SPA**: `index.html` at repo root (~5500 lines) — inline CSS + JS, no framework. Mirrored in `fastapi-app/templates/index.html`
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) for utility classes
- **IndexedDB** (`idb-keyval` via CDN) for local data storage (guest mode)
- **Supabase** (`@supabase/supabase-js` via CDN) for cloud auth and database (project ref: `iwkbuurltlnaszptrgth`) — integrated with Vercel and GitHub
- **Vercel** deployment at `https://skillstack-learn.vercel.app` with SPA rewrites (`vercel.json`) — auto-runs `vite build` via root `vite.config.js`
- **Service worker** at `sw.js` for offline caching
- **GitHub**: `Rester525/knowledge-dashboard` — push to main triggers Vercel deploy
- **html2pdf.js** (v0.10.1 via CDN) — client-side PDF generation
- **Google Identity Services (GIS)** — OAuth for Google Drive API access

## Services Used

| Service | Purpose | How We Use It |
|---------|---------|---------------|
| **Supabase** | Auth + Database (PostgreSQL) | Cloud user auth (email/password), REST API CRUD for notes/todos/bookmarks, RLS for per-user isolation |
| **Vercel** | SPA hosting | Deploys `index.html` with SPA rewrites; git push to main auto-deploys |
| **FastAPI** | Local backend (Python) | SQLite CRUD, Ollama AI endpoints, ChromaDB vector search, PDF/YouTube notesheet generation |
| **Ollama** | AI model inference | `qwen3:8b` for notesheet/quiz generation + AI editing; `qwen2.5vl:7b` for OCR fallback |
| **ChromaDB** | Vector search | `sentence-transformers/all-MiniLM-L6-v2` embeddings for semantic note search |
| **SQLite** | Local database | All CRUD data for guest mode via `aiosqlite` |
| **Google Drive API** | Cloud export | GIS OAuth → upload notesheets as Google Docs |
| **Next.js + Neon + OpenAI** | Secondary backend | Separate deployment at `next-app-weld-eight.vercel.app`

## Key Files

| File | Purpose |
|------|---------|
| `index.html` (root) | The entire SPA — HTML, CSS (~700 lines inline), JS (~1550 lines inline) |
| `kd-test.mjs` | Core E2E test suite — 27 tests (navigation, UI elements, keyboard shortcuts, calculator, study timer, command palette) |
| `kd-features.mjs` | Feature tests — 14 tests (settings, themes, accent colors, backgrounds, login overlay, auth form toggle, Ctrl+8) |
| `screenshot-test.mjs` | Playwright screenshot script — 13 screenshots of auth flows, themes, backgrounds, accents, sidebar, command palette |
| `test-full.mjs` | Full CRUD tests |
| `test-pdf-notesheet.mjs` | PDF notesheet E2E test (localhost backend) — 4 tests |
| `test-vercel-pdf.mjs` | PDF notesheet E2E test (Vercel SPA → tunnel) — 3 tests |
| `schema.sql` | Idempotent Supabase migration — tables, RLS policies, indexes |
| `vercel.json` (root) | SPA rewrites config for Vercel |
| `PROJECT_BRIEF.md` | Comprehensive project reference (for sharing with AI tools like Gemini) |

## Views & Navigation

7 views navigable via sidebar or `Ctrl+1` through `Ctrl+7`:
1. Dashboard (stats overview)
2. Notes (CRUD + inline search, Delete All)
3. Todos (CRUD with Kanban toggle)
4. Bookmarks (CRUD)
5. Calculator (math with presets)
6. Study (timer with Pomodoro 25/5 preset, 4 study tabs: Notesheet, Quiz, Timer, Saved Notesheets)
7. Settings (theme, accent colors, export/import, account info)

Search was merged into Notes view. Ctrl+F navigates to Notes and focuses search.

## What's Implemented

- **Auth (Supabase)**: Three-pillar login gateway — Sign In, Create Account (with back button to Sign In), and Guest/Offline Mode. Login overlay with email/password sign in and sign up via Supabase Auth. Form state management with `showAuthMode()`, `updateAuthFormState()`, `backToSignIn()`. Handles confirmation email flow, duplicate accounts, session persistence via `getSession()`, auth state listener, and sign out. Guest mode (IndexedDB) still available.
- **Guest mode**: All data stored in IndexedDB via `idb-keyval` — works offline
- **Themes**: Standard, Retro (`.theme-retro`), 8-Bit (`.theme-8bit`) — selectable cards in Settings, persisted in `localStorage('kd-theme')`
- **Accent colors**: 10 colors (blue, green, purple, amber, rose, red, orange, teal, cyan, indigo) — stored in `localStorage('kd-accent')`, rendered as clickable swatches in sidebar and Settings
- **Backgrounds**: 4 options (Solid, Gradient, Glass, Synthwave) — CSS classes `.bg-gradient`, `.bg-glass`, `.bg-synthwave`, persisted in `localStorage('kd-background')`
- **3D buttons**: `.btn-3d` class with box-shadow + translateY on :active
- **Command palette**: Ctrl+K to open, keyboard navigation, fuzzy-like search
- **Export/Import**: Full data export/import via JSON files in Settings
- **Keyboard shortcuts**: Ctrl+1-8 for navigation, Ctrl+K for palette, Escape to close
- **Sidebar auth display**: Shows email when signed in via cloud, "Guest Mode" when local
- **Stats NaN guard**: Null/undefined stats values coerced to 0 (avoids "NaN" display)
- **Vercel deployed**: SPA routing via rewrites
- **Saved Notesheets tab**: Dedicated tab in Study view — fetches notes, filters by "Notesheet:" prefix, renders card list with grid/list toggle. Click to view rendered notesheet with export + AI edit.
- **AI editing**: Textarea + "Edit with AI" button below saved notesheets, calls FastAPI `/api/ai/notesheet/edit` endpoint (Ollama qwen3:8b)
- **Mass delete**: Collapsible age-based bulk delete bar in Saved Notesheets tab — 7d/30d/90d/6mo/1yr options, calls `POST /api/notes/delete-old`
- **Per-account notesheet limit**: 50 notesheets max, enforced server-side with 429 response
- **PROJECT_BRIEF.md**: Comprehensive project reference document for sharing with AI tools (Gemini, etc.)

## Tests

```bash
node kd-test.mjs              # Core tests (26) — navigation, UI, keyboard, calculator, timer
node kd-features.mjs          # Feature tests (15) — settings, themes, backgrounds, auth overlay
node screenshot-test.mjs      # Screenshot capture (13) — auth flows, themes, backgrounds, accents
node test-full.mjs            # Full CRUD tests
node test-pdf-notesheet.mjs   # PDF notesheet test (requires local FastAPI backend)
node test-downloads.mjs       # PDF + Google Drive export tests
```

Tests use Playwright, bypass login via `localStorage.setItem('kd-auth', 'guest')`.

## Supabase Project

**Project:** `knowledge-dashboard` (ref: `iwkbuurltlnaszptrgth`, region: `us-west-1`, free plan)
**URL:** `https://iwkbuurltlnaszptrgth.supabase.co`
**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2J1dXJsdGxuYXN6cHRyZ3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODE4MjgsImV4cCI6MjA5NTA1NzgyOH0.4g0MsWlqshTueCe-RrGjAGNZON89JwEAI4k8SnseyrY`
**Service key:** `[redacted — stored in ~/.claude.json]`
**Database:** PostgreSQL 17 with tables: `notes`, `todos`, `bookmarks` — each with per-user RLS policies (`auth.uid() = user_id`), `user_id` indexes
**Auth:** Email/password with confirmation email — sign up and sign in flow working in the SPA
**Schema:** `schema.sql` in repo root — idempotent, run via `npx supabase db query --linked --file schema.sql`
**Access token (MCP):** `[redacted — set in ~/.claude.json]`

### MCP Configuration

The official Supabase MCP server is in `~/.claude.json`:
- URL: `https://mcp.supabase.com/mcp?project_ref=iwkbuurltlnaszptrgth&features=docs,account,database,debugging,development,functions,branching,storage`
- Auth: Bearer token via `SUPABASE_ACCESS_TOKEN` (= the access token above)
- Scoped to `/home/rishi-reddy/my-project` directory
- **Needs session restart** to load tools

_Deprecated custom MCP server at `~/my-project/supabase-mcp/` has been deleted._

### SPA Auth Implementation Details

- Supabase client created at page load via `supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
- `handleAuthSubmit()` calls `signUp()` or `signInWithPassword()` depending on mode
- Auth decision on page load: checks `localStorage('kd-auth')` — if `'cloud'`, tries `getSession()`; if `'guest'` or offline, proceeds as guest
- `_isCloudUser` flag tracks which mode the app is in
- `_supabase.auth.onAuthStateChange` listener handles `SIGNED_OUT`, `SIGNED_IN`, `TOKEN_REFRESHED` events
- Sidebar renders user email when cloud user, "Guest Mode" otherwise

### Cloud CRUD Implementation Details

When `_isCloudUser` is true, the `api()` function routes CRUD operations (notes, todos, bookmarks) to Supabase REST API at `{SUPABASE_URL}/rest/v1/{entity}` instead of the FastAPI backend:

- **Reads (GET)**: Fetches from Supabase REST with `Authorization: Bearer <session_token>` and `apikey` headers. RLS policies enforce per-user isolation (`auth.uid() = user_id`). Data is cached in IndexedDB as local fallback. Single-item GETs use `?id=eq.{id}&select=*` filter.
- **Creates (POST)**: Saves to IndexedDB first (local-first), then POSTs to Supabase REST. For cloud creates, `user_id` is set to the current user's UUID from the auth session. Uses `Prefer: return=representation` header to get the created record back. The Supabase-assigned UUID replaces the temp local ID in IndexedDB.
- **Updates (PUT)**: Saves to IndexedDB first, then PATCHes to Supabase REST (Supabase uses PATCH for partial updates, not PUT). Falls back to sync queue if offline.
- **Deletes (DELETE)**: Removes from IndexedDB immediately, then DELETEs from Supabase REST. Falls back to sync queue if offline.
- **Sync queue**: Items queued while offline record `isCloud: true` so `processSyncQueue()` replays them against the correct backend (Supabase REST vs FastAPI) when connectivity returns.
- **Non-CRUD paths** (stats, search, AI): Always go to FastAPI backend regardless of auth mode.

**Guest mode** continues to use the FastAPI backend for all CRUD — unchanged.

## Current Session Context

_Last worked on: 2026-05-26_

### Completed Features

All 5+2 requested features implemented, deployed, and verified:
1. **Saved Notesheets tab** (`#stab-saved`) in Study view — fetches notes, filters by "Notesheet:" prefix, renders card list with grid/list toggle. Click to open in viewer with full render and export buttons.
2. **AI editing** — textarea + "Edit with AI" button below saved notesheets. Calls `POST /api/ai/notesheet/edit` on FastAPI backend (Ollama qwen3:8b). Updates content and re-renders.
3. **Export from saved notesheets** — Download PDF and Save to Google Docs buttons via refactored `addNotesheetActions(content, title)`.
4. **Per-account limit** — `NOTESHEET_LIMIT = 50` enforced on all 3 generation endpoints (text, PDF, YouTube). Frontend shows toast on 429.
5. **Age-based bulk delete** — Settings → "Data Management" section, dropdown + confirm. Backend `POST /api/notes/delete-old`. Also `GET /api/notesheet/stats`.
6. **Grid/List view toggle** — `_nsViewMode` state variable, CSS grid for grid mode, shorter previews (80 chars) in grid cards.
7. **Mass delete at top of saved notesheets** — Collapsible bar in saved tab header, more visible than Settings version.
8. **PROJECT_BRIEF.md** — Comprehensive 11-section project reference document for sharing with AI tools.

### Bug Fixes

- **"Save to Google Docs" HTML fallback timed out in headless/Playwright.** GIS OAuth popup hung indefinitely with no user interaction. Fix: 8-second `Promise.race` timeout around `requestDriveToken()`.

### Test Results

- `kd-test.mjs`: 26/26 passed
- `kd-features.mjs`: 15/15 passed  
- `test-downloads.mjs`: PDF (3058 bytes) ✓ + HTML fallback (5048 bytes) ✓

## Project-level CLAUDE.md files

- `fastapi-app/CLAUDE.md` — FastAPI + SQLite + ChromaDB backend (separate deployment)
- `next-app/CLAUDE.md` — Next.js 16 + Neon Postgres + OpenAI backend (separate deployment)
