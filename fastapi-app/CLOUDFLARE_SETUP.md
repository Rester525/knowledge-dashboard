# Cloudflare Deployment & Performance Guide

## Architecture Overview

```
                         ┌─────────────────────────┐
                         │     Cloudflare Edge      │
                         │  (200+ data centres)     │
                         │                          │
  Browser ─────HTTPS────►│  ┌───────────────────┐   │
                         │  │  Cache Rules       │   │
                         │  │  • Static assets:   │   │
                         │  │    cache 1 year     │   │
                         │  │  • /api/search:     │   │
                         │  │    bypass cache     │   │
                         │  └───────────────────┘   │
                         │         │                 │
                         │         ▼                 │
                         │  ┌───────────────────┐   │
                         │  │  Early Hints       │   │
                         │  │  (103 status)      │   │
                         │  │  • Preconnects     │   │
                         │  │  • Critical CSS    │   │
                         │  └───────────────────┘   │
                         │         │                 │
                         │         ▼                 │
                         │  ┌───────────────────┐   │
                         │  │  Brotli / Tiered   │   │
                         │  │  Cache / Polish    │   │
                         │  └───────────────────┘   │
                         │         │                 │
                         └─────────┼─────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │     Origin Server         │
                    │  (FastAPI / Uvicorn)      │
                    │                           │
                    │  • SQLite (WAL mode)      │
                    │  • ChromaDB (HNSW index)  │
                    │  • sentence-transformers  │
                    └──────────────────────────┘
```

## Deployment Options

### Option A: Cloudflare Tunnel (Recommended for Local-First)

Run the FastAPI server locally and expose it through Cloudflare Tunnel. This gives you the edge network benefits without needing a VPS.

```
                    ┌─────────────┐     ┌──────────────┐
                    │  Cloudflare  │◄────│  cloudflared  │
                    │  Edge        │     │  tunnel       │
                    │  Network     │────►│  (your machine)│
                    └─────────────┘     └──────┬───────┘
                                               │
                                         ┌─────▼──────┐
                                         │  FastAPI    │
                                         │  localhost  │
                                         │  :8000      │
                                         └────────────┘
```

### Option B: VPS + Cloudflare Proxy

Deploy FastAPI on any VPS (DigitalOcean, Railway, Fly.io) and point your Cloudflare DNS at it.

---

## Step-by-Step Cloudflare Dashboard Configuration

### 1. Add Your Domain to Cloudflare

1. Go to **Cloudflare Dashboard** → **Add a Site**
2. Enter your domain (e.g., `yourdomain.com`)
3. Select the **Free** plan
4. Cloudflare will scan existing DNS records
5. Update your nameservers at your registrar to the ones Cloudflare provides

### 2. DNS Configuration

In **DNS → Records**, add:

| Type | Name | Content | Proxy Status |
|------|------|---------|-------------|
| A | `@` | `192.0.2.1` (or your VPS IP) | Proxied (orange cloud) |
| CNAME | `www` | `yourdomain.com` | Proxied |
| CNAME | `*` | `yourdomain.com` | Proxied (optional catch-all) |

> **Why Proxied?** The orange cloud means all traffic goes through Cloudflare's edge, enabling caching, DDoS protection, and Early Hints. Without it, traffic bypasses Cloudflare entirely.

### 3. SSL/TLS Settings

**SSL/TLS → Overview:**
- Set to **Full (strict)** — requires a valid SSL certificate on your origin server
- This ensures traffic is encrypted end-to-end: browser ↔ Cloudflare ↔ origin

**SSL/TLS → Edge Certificates:**
- Enable **Always Use HTTPS** — redirects any HTTP requests to HTTPS
- Enable **Automatic HTTPS Rewrites** — fixes mixed-content warnings

### 4. Speed → Optimization

#### 4a. Auto Minify
- Enable **JavaScript**, **CSS**, and **HTML** minification
- Cloudflare minifies these on-the-fly at the edge — no build step needed
- The JS in `index.html` is already concise, but minification strips comments/whitespace saving ~15%

#### 4b. Brotli Compression
- Set **Brotli** to **Enabled** (it's on by default)
- Brotli achieves ~20% better compression than gzip for HTML/CSS/JS
- The `index.html` (~30 KB) compresses to ~8 KB with Brotli

#### 4c. Early Hints
- Enable **Early Hints**
- Cloudflare sends a `103 Early Hints` header while the HTML is still being generated
- The browser begins preconnecting to CDNs and preloading fonts immediately
- **Measured impact:** 200-400 ms faster Largest Contentful Paint (LCP)

#### 4d. Rocket Loader
- Set to **Manual** and test
- Rocket Loader async-loads vanilla JS to prioritise above-fold content
- **⚠️ Caution:** If the SPA breaks, disable Rocket Loader — it can interfere with inline `<script>` execution order. For this app, it's safe because all JS is inline in a single `<script>` tag at the bottom of `<body>`.

### 5. Speed → Tiered Cache

- Enable **Tiered Cache**
- This creates a hierarchy: edge POPs → upper-tier POPs → origin
- If a lower-tier POP misses, it checks an upper-tier POP before hitting your origin
- **Why it matters for this app:** Your origin is on a local machine (Option A) or a small VPS (Option B). Tiered Cache dramatically reduces the number of requests reaching it.

### 6. Speed → Polish

- Set **Polish** to **Lossless**
- Cloudflare compresses images at the edge (for any images you add later)
- Does not affect the vanilla JS/HTML/CSS optimization

### 7. Caching Rules

Navigate to **Caching → Cache Rules** and create:

#### Rule 1: Static Assets (long cache)
```
Field: Hostname equals yourdomain.com
AND URI Path contains "/static/"
→ Cache TTL: 1 year
→ Browser Cache TTL: 1 year
→ Edge Cache TTL: 1 year
```

Currently this app has no `/static/` folder (everything is in `index.html`). If you extract CSS/JS to separate files in the future, this rule catches them.

#### Rule 2: API Search (no cache)
```
Field: Hostname equals yourdomain.com
AND URI Path starts with "/api/search"
→ Cache Status: Bypass cache
→ Edge Cache TTL: 0
```

Search results must always be fresh. This rule ensures Cloudflare never serves stale vector-search results.

#### Rule 3: HTML (short cache)
```
Field: Hostname equals yourdomain.com
AND URI Extension equals "html" OR URI Path equals "/"
→ Cache TTL: 1 hour
→ Browser Cache TTL: 1 hour
```

The `index.html` rarely changes. 1-hour edge caching means most visitors get it from the nearest POP without hitting the origin.

### 8. Network → HTTP/2 and HTTP/3

- Enable **HTTP/2** (on by default)
- Enable **HTTP/3** (QUIC) — faster connection establishment, especially on mobile networks
- Keep **0-RTT Connection Resumption** enabled — repeat visitors skip the TLS handshake entirely

### 9. Network → ARGO

- Enable **Argo Smart Routing** (if available on your plan)
- Routes traffic across the least congested paths on Cloudflare's backbone
- Reduces origin latency by ~30% on average

---

## Performance Checklist

| Feature | Status | Impact |
|---------|--------|--------|
| Proxy DNS (orange cloud) | Required | Enables all edge features |
| SSL Full (strict) | Required | End-to-end encryption |
| Always Use HTTPS | On | No plaintext fallback |
| Brotli Compression | On | ~20% smaller assets |
| Auto Minify (JS/CSS/HTML) | On | ~15% smaller |
| Early Hints | On | -200ms LCP |
| Tiered Cache | On | Fewer origin hits |
| Polish (Lossless) | On | Optimised images |
| Cache Rule: Static 1yr | On | Zero origin load for assets |
| Cache Rule: /api/search bypass | On | Fresh search results |
| Cache Rule: HTML 1hr | On | Edge-cached landing |
| HTTP/3 (QUIC) | On | Faster mobile connections |
| Rocket Loader | Test | Async JS loading |

---

## Verifying Performance

After setup, verify from a cold cache:

```bash
# Test from a nearby edge POP
curl -s -o /dev/null -w "Connect: %{time_connect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://yourdomain.com

# Check response headers for Cloudflare
curl -sI https://yourdomain.com | grep -i cf-

# Verify Early Hints
curl -s -D - https://yourdomain.com | head -20
```

**Target numbers for this app:**
- TTFB (cold cache): < 200 ms (origin generates HTML + ChromaDB search)
- TTFB (warm cache): < 50 ms (served entirely from Cloudflare edge)
- Full page load: < 1 s on 4G
