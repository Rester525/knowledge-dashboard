# Knowledge Dashboard — Next.js App

## Stack
- **Framework:** Next.js 16.2.6 (App Router, TypeScript, Turbopack dev)
- **Styling:** Tailwind v4 with PostCSS; glassmorphism cards (`glass-card` class, `bg-white/5` overlays, `backdrop-blur`)
- **DB:** Neon serverless Postgres (`@neondatabase/serverless`) with tagged template literal queries
- **Auth:** JWT cookies via `jose` + `bcryptjs`; `session` HttpOnly cookie (7-day expiry)
- **AI:** OpenAI `gpt-4o-mini` for task detection; `text-embedding-3-small` for embedding search
- **Deploy:** Vercel at `https://next-app-weld-eight.vercel.app`
- **Packages:** `openai`, `jose`, `bcryptjs`, `@neondatabase/serverless` — no `googleapis` npm package (Gmail is plain `fetch`)

## Auth system (`src/lib/auth.ts`)
- `getAuthUser(request)` — reads `session` cookie, verifies HS256 JWT, returns `{ userId }` or `null`
- `createToken(userId)` / `createSessionCookie(token)` — issues JWT + Set-Cookie header
- `hashPassword` / `verifyPassword` — bcryptjs with salt rounds 10
- Every API route starts with `const auth = await getAuthUser(request); if (!auth) return 401`

## Database (`src/lib/db/`)
- `index.ts` — lazy `neon()` singleton; exports `sql` tagged template and `initSchema()`
- `schema.sql` — full DDL (drops + creates); run via `POST /api/migrate`
- Tables: `users`, `notes` (embedding VECTOR(1536)), `todos`, `bookmarks`, `email_scans`, `gmail_accounts`
- `email_scans` — deduplicates processed emails by `message_id` (TEXT PK)
- `gmail_accounts` — stores per-user Gmail OAuth refresh tokens; `UNIQUE(user_id, email)`
- Query pattern: `const rows = await sql`SELECT ... WHERE user_id = ${auth.userId}``

## API route conventions
- Route handlers in `src/app/api/*/route.ts` — exports `GET`/`POST`/`DELETE` functions
- All handlers take `(request: Request)` and return `Response.json(...)` or `Response.redirect(...)`
- Auth guard at top of every handler (except auth/signup/login)
- CSP: `connect-src 'self'` in `next.config.ts` (allows localhost:3000 in dev)

## Email Scanner architecture

### OAuth flow (web application, not installed app)
1. `GET /api/gmail/auth` — generates Google OAuth URL with `gmail.modify` scope, `offline` access, CSRF state cookie; returns `{ url }`
2. User clicks "Connect Gmail" → redirected to Google consent screen
3. Google redirects to `/api/gmail/callback?code=...&state=...`
4. Callback validates state cookie, exchanges code for tokens, fetches user profile, stores `refresh_token` in `gmail_accounts` table
5. Redirects to `/?gmail=connected` or `/?gmail=error`

**OAuth client** (`Client-secret-emailchecker.json`):
- Client ID: `751382904143-dcv26p9s7n10a2010mn95ofhnqbubafr.apps.googleusercontent.com`
- Redirect URIs: `http://localhost:3000/api/gmail/callback`, `https://next-app-weld-eight.vercel.app/api/gmail/callback`
- JS origins: `http://localhost:3000`, `https://next-app-weld-eight.vercel.app`

### Scanning pipeline (`POST /api/scan-emails`)
1. `getAccountsForUser(auth.userId)` — reads all connected Gmail accounts from DB
2. For each account: `getAccessToken(refreshToken)` — exchanges refresh token (in-memory cache, 60s buffer)
3. `getUnprocessedEmails(accessToken)` — Gmail REST API, `q=-label:task-processed -label:SENT`, format=full
4. For each email: check `email_scans` dedup table → `detectTask(subject, body, sender)` via OpenAI
5. If task detected → `INSERT INTO todos` with `[PRIORITY] title — description`
6. `labelAsProcessed()` → adds `task-processed` Gmail label
7. `INSERT INTO email_scans` for dedup

### Key files
- `src/lib/gmail.ts` — token exchange, email fetch, MIME body extraction, label CRUD, `getAccountsForUser()`
- `src/lib/scan.ts` — OpenAI task detection (ported from Python `detector.py` prompt)
- `src/app/api/gmail/auth/route.ts` — OAuth URL generator
- `src/app/api/gmail/callback/route.ts` — OAuth callback handler
- `src/app/api/gmail/accounts/route.ts` — `GET` list accounts, `DELETE` disconnect
- `src/components/EmailScanner.tsx` — "Connect Gmail" / "Scan Emails" UI

### Environment variables (`.env.local` + Vercel)
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `OPENAI_API_KEY` | OpenAI API key for embeddings + task detection |
| `JWT_SECRET` | HS256 signing secret for session cookies |
| `GMAIL_CLIENT_ID` | Google OAuth web client ID |
| `GMAIL_CLIENT_SECRET` | Google OAuth web client secret |

## Component patterns
- All components are `"use client"` (dashboard is SPA with API calls)
- Glassmorphism: `glass-card` class = `bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl`
- Buttons: `btn-primary` (purple gradient), `btn-ghost` (transparent hover)
- Toast system: `showToast(message, type)` from `components/Toast.tsx`; `<ToastContainer />` rendered once in layout
- Data flow: parent passes `onCreated` callback → child calls it after mutation → parent re-fetches
- Auth gating: `useAuth()` hook → if `!user && !loading` render `<AuthForm />`

## Dev workflow
```bash
cd knowledge-dashboard/next-app
npm run dev       # starts on localhost:3000 with Turbopack
npm run build     # production build
```

## Vercel deployment
```bash
cd knowledge-dashboard/next-app
vercel --prod     # deploys to next-app-weld-eight.vercel.app
```
Env vars must be set in Vercel dashboard (`vercel env add`) — they're not read from `.env.local` in production.
