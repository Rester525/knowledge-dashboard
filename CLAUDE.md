# Knowledge Dashboard

> **IMPORTANT**: This file is the single source of truth for project state and survives conversation compression. Keep it current — particularly the "What Still Needs to Happen" and "Current Session Context" sections. After every significant change, update this file so the next session picks up without asking for status.

Single-page vanilla JS knowledge management app — notes, todos, bookmarks, calculator, study timer, search, settings. Deployed on Vercel.

## Architecture

- **Single file SPA**: `spain-czechrepublic-2016.com/index.html` (~2100 lines) — inline CSS + JS, no framework
- **Tailwind CSS** via CDN (`cdn.tailwindcss.com`) for utility classes
- **IndexedDB** (`idb-keyval` via CDN) for local data storage (guest mode)
- **Supabase** (`@supabase/supabase-js` via CDN) for cloud auth and database (project ref: `iwkbuurltlnaszptrgth`)
- **Vercel** deployment at `https://knowledge-dashboard-zeta.vercel.app` with SPA rewrites (`vercel.json`)
- **Service worker** at `sw.js` for offline caching
- No build step — edit `index.html` directly and deploy

## Key Files

| File | Purpose |
|------|---------|
| `spain-czechrepublic-2016.com/index.html` | The entire app — HTML, CSS (~700 lines inline), JS (~1300 lines inline) |
| `kd-test.mjs` | Core E2E test suite — 27 tests (navigation, UI elements, keyboard shortcuts, calculator, study timer, command palette) |
| `kd-features.mjs` | Feature tests — 15 tests (settings, themes, accent colors, login overlay, auth form toggle, Ctrl+8) |
| `test-full.mjs` | Full CRUD tests |
| `schema.sql` | Idempotent Supabase migration — tables, RLS policies, indexes |
| `spain-czechrepublic-2016.com/vercel.json` | SPA rewrites config |
| `spain-czechrepublic-2016.com/sw.js` | Service worker |

## Views & Navigation

8 views navigable via sidebar or `Ctrl+1` through `Ctrl+8`:
1. Dashboard (stats overview)
2. Notes (CRUD with IndexedDB)
3. Todos (CRUD with Kanban toggle)
4. Bookmarks (CRUD)
5. Search (text search across notes)
6. Calculator (math with presets)
7. Study (timer with Pomodoro 25/5 preset, 3 study tabs)
8. Settings (theme, accent colors, export/import, account info)

## What's Implemented

- **Auth (Supabase)**: Login overlay with email/password sign in and sign up via Supabase Auth. Handles confirmation email flow, duplicate accounts, session persistence via `getSession()`, auth state listener, and sign out. Guest mode (IndexedDB) still available.
- **Guest mode**: All data stored in IndexedDB via `idb-keyval` — works offline
- **Themes**: Standard, Retro (`.theme-retro`), 8-Bit (`.theme-8bit`) — persisted in `localStorage('kd-theme')`
- **Accent colors**: 10 colors (blue, green, purple, amber, rose, red, orange, teal, cyan, indigo) — stored in `localStorage('kd-accent')`
- **3D buttons**: `.btn-3d` class with box-shadow + translateY on :active
- **Command palette**: Ctrl+K to open, keyboard navigation, fuzzy-like search
- **Export/Import**: Full data export/import via JSON files in Settings
- **Keyboard shortcuts**: Ctrl+1-8 for navigation, Ctrl+K for palette, Escape to close
- **Sidebar auth display**: Shows email when signed in via cloud, "Guest Mode" when local
- **Stats NaN guard**: Null/undefined stats values coerced to 0 (avoids "NaN" display)
- **Vercel deployed**: SPA routing via rewrites

## Tests

```bash
node kd-test.mjs       # Core tests (27) — navigation, UI, keyboard, calculator, timer
node kd-features.mjs   # Feature tests (15) — settings, themes, auth overlay
node test-full.mjs     # Full CRUD tests
```

Tests use Playwright, bypass login via `localStorage.setItem('kd-auth', 'guest')`.

## Supabase Project

**Project:** `knowledge-dashboard` (ref: `iwkbuurltlnaszptrgth`, region: `us-west-1`, free plan)
**URL:** `https://iwkbuurltlnaszptrgth.supabase.co`
**Anon key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3a2J1dXJsdGxuYXN6cHRyZ3RoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODE4MjgsImV4cCI6MjA5NTA1NzgyOH0.4g0MsWlqshTueCe-RrGjAGNZON89JwEAI4k8SnseyrY`
**Service key:** `[redacted — set in ~/.claude.json]`
**Database:** PostgreSQL 17 with tables: `notes`, `todos`, `bookmarks` — each with per-user RLS policies (`auth.uid() = user_id`), `user_id` indexes
**Auth:** Email/password with confirmation email — sign up and sign in flow working in the SPA
**Schema:** `schema.sql` in repo root — idempotent, run via `npx supabase db query --linked --file schema.sql`
**Access token (MCP):** `[redacted — set in ~/.claude.json]`

### MCP Configuration

The official Supabase MCP server is in `~/.claude.json`:
- URL: `https://mcp.supabase.com/mcp?project_ref=iwkbuurltlnaszptrgth&features=docs,account,database,debugging,development,functions,branching,storage`
- Auth: Bearer token via `SUPABASE_ACCESS_TOKEN` (= the access token above)
- Scoped to `/home/rishi-reddy/my-project` and `spain-czechrepublic-2016.com` directories
- **Needs session restart** to load tools

A custom-built fallback MCP server also exists at `~/my-project/supabase-mcp/` (deprecated).

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

## What Still Needs to Happen

### Vercel Env
- Add environment variables on Vercel: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`

### MCP Configuration
- Session restart needed for Supabase MCP tools to appear in tool list

## Current Session Context

_Last worked on: 2026-05-22 — Cloud CRUD layer wired up in the SPA, deprecated custom Supabase MCP server cleaned up. Vercel env vars pending (awaiting MCP auth)._

## Project-level CLAUDE.md files

- `fastapi-app/CLAUDE.md` — FastAPI + SQLite + ChromaDB backend (separate deployment)
- `next-app/CLAUDE.md` — Next.js 16 + Neon Postgres + OpenAI backend (separate deployment)
