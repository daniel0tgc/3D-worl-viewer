# LEARN.md — Systems Engineering Lessons for Production-First App Building

Lessons extracted from building WorldView (Vite + React + CesiumJS + Vercel).
Written as input context you should give Cursor at the start of any new project.

---

## How to Use This File

At the start of every new project, paste the relevant sections into your first
Cursor prompt or into `.cursorrules`. The goal is to eliminate entire categories
of bugs before they occur by giving the AI the right constraints upfront.

---

## Part 1 — API and Network Architecture

### Lesson 1: Identify CORS posture of every external API before writing a single fetch

Before coding any data fetcher, answer this question for each API you plan to use:

> "Does this API return `Access-Control-Allow-Origin: *` or my domain?"

Test it with:
```bash
curl -I https://api.example.com/endpoint
```
Look for `Access-Control-Allow-Origin` in the response headers.

**If the header is absent or locked to a specific domain, you cannot call this API
directly from a browser. Plan a proxy from day one.**

Categories:
- `Access-Control-Allow-Origin: *` → call directly from the browser, no proxy needed (USGS, Celestrak)
- `Access-Control-Allow-Origin: https://theirsite.com` → proxy required (OpenSky)
- No header → proxy required (NYC DOT cameras)
- `403` or `401` → check API key referrer restrictions (Google Maps Platform)

**Cursor prompt to include upfront:**
> "For every external API fetch, first confirm its CORS policy. If CORS is not
> open, use a serverless proxy instead of a direct browser fetch. Never add a
> direct fetch to a CORS-restricted API without noting it requires a proxy in production."

---

### Lesson 2: Design the dev/prod URL split on day one

This project added a Vite dev proxy (`vite.config.ts → server.proxy`) partway
through, then discovered it only works locally. The fix required a second pass
to add Vercel serverless functions and a `publicApi.ts` config layer.

**The correct pattern from the start:**

```
src/config/publicApi.ts     ← owns all external URLs
  getOpenSkyStatesUrl()     → /api/opensky/states/all      (prod)
                            → https://opensky-network.org/... (dev)
  getCaltransCctvUrl(d)     → /api/proxy/caltrans?district=d3 (prod)
                            → https://cwwp2.dot.ca.gov/...    (dev)

api/opensky/states/all.ts   ← Vercel serverless proxy (prod)
vite.config.ts proxy        ← Vite dev proxy (dev only, mirrors api/ layout)
```

**Rule:** Every URL that will ever be proxied must route through a single config
function that switches on `import.meta.env.DEV`. Never hardcode API URLs
directly in data fetchers.

**Cursor prompt to include upfront:**
> "Create `src/config/publicApi.ts` to centralize all external API URLs. Each
> function must return the dev URL when `import.meta.env.DEV` is true and the
> same-origin `/api/...` path in production. No data fetcher may hardcode an
> external URL directly."

---

### Lesson 3: Serverless function file paths must exactly mirror their URL

On Vite + Vercel (not Next.js), dynamic catch-all routes (`[...slug].ts`) do not
work reliably. The file path under `api/` is the route.

```
File                              Public URL
api/opensky/states/all.ts     →  /api/opensky/states/all
api/proxy/nyctmc/api/cameras.ts → /api/proxy/nyctmc/api/cameras
api/proxy/caltrans.ts         →  /api/proxy/caltrans
```

Never use `[...slug]` or `[param]` segments in Vercel API routes unless you are
using Next.js. On plain Vite, create one file per exact URL.

**Shared code** lives in `api/_lib/` (underscore prefix = not treated as a route).

**Cursor prompt to include upfront:**
> "This is a Vite app, not Next.js. All Vercel serverless functions must use
> static file paths that exactly mirror their public URL. No dynamic route
> segments. Shared helpers go in `api/_lib/`."

---

### Lesson 4: TypeScript import extensions in serverless functions

Under `moduleResolution: NodeNext` (what Vercel uses to compile API routes),
TypeScript requires `.js` extensions on imports — even when the source file is `.ts`.

```typescript
// Wrong — will cause TS2835 and silently break the entire deploy
import { fn } from '../_lib/myHelper'

// Correct
import { fn } from '../_lib/myHelper.js'
```

A single TS error in any `api/` file can prevent ALL functions from deploying,
causing 404s across every endpoint with no obvious error in the browser.

**Cursor prompt to include upfront:**
> "All imports inside `api/` functions must include `.js` file extensions
> (TypeScript NodeNext convention). Check Vercel build logs under Functions to
> confirm all routes registered after every deploy."

---

### Lesson 5: Never put real credentials in `VITE_` variables

Any `VITE_*` environment variable is compiled into the public JavaScript bundle.
Anyone can open DevTools and read it.

```
VITE_OPENSKY_CLIENT_SECRET=abc123   ← visible in browser network tab ❌
OPENSKY_CLIENT_SECRET=abc123        ← server-only, never sent to browser ✅
```

**Rule:** If an API credential would cause harm if leaked, it must live in a
non-`VITE_` variable and only be used inside `api/` serverless functions.
Client code may only call your own `/api/...` endpoints.

**Cursor prompt to include upfront:**
> "OAuth secrets and API keys that must not be public go in server-only env vars
> (no `VITE_` prefix) and are accessed only inside `api/` functions. Client code
> calls `/api/...` only, never third-party auth endpoints directly."

---

## Part 2 — Deployment Configuration

### Lesson 6: Add Vercel environment variables before first deploy

Vercel does not read your local `.env` file. Every `VITE_*` and server-only
variable must be added in Vercel → Project → Settings → Environment Variables,
scoped to Production (and Preview if you use preview deployments).

Missing env vars cause silent failures — the globe loads but features silently
break because the keys are `undefined`.

**Pre-deploy checklist:**
- [ ] All `VITE_*` keys added in Vercel for Production
- [ ] All server-only keys (no `VITE_`) added for Production
- [ ] `.env.example` is up to date and committed

---

### Lesson 7: Configure API key referrer restrictions before going live

Google Maps Platform, Cesium Ion, and similar services let you lock API keys to
specific HTTP referrers (domains). If you create a key on localhost and deploy
to Vercel, the key will return 403 from production.

**Before first deploy:**
1. Open Google Cloud Console → Credentials → your key
2. Under Application restrictions → HTTP referrers, add:
   - `https://your-app.vercel.app/*`
   - `https://*.vercel.app/*` (for preview deployments)
   - `http://localhost:5173/*` (for local dev)
3. Do the same for Cesium Ion token if it has domain restrictions

**Cursor prompt to include upfront:**
> "Note in `.env.example` which API keys require HTTP referrer configuration in
> their respective consoles. List the domains that must be whitelisted."

---

### Lesson 8: The Vite dev server is not a production server — plan for this gap

`vite.config.ts → server.proxy` exists only during `npm run dev`. It vanishes
on deploy. Every dev-server convenience (proxies, middleware, rewrites) needs a
production equivalent planned from the start.

**The mental checklist before adding anything to `vite.config.ts`:**
> "Will this still work in production? If not, what is the production equivalent,
> and can I build both at the same time?"

---

## Part 3 — Error Handling Patterns

### Lesson 9: Use `Promise.allSettled` for all parallel data fetches

When fetching from multiple sources (multiple camera regions, multiple API
endpoints), a single failure should never block the others. Use `Promise.allSettled`
not `Promise.all`.

```typescript
// Breaks entirely if one source fails
const results = await Promise.all([fetchA(), fetchB(), fetchC()])

// Degrades gracefully — partial data is better than no data
const results = await Promise.allSettled([fetchA(), fetchB(), fetchC()])
const data = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value)
```

**Cursor prompt to include upfront:**
> "All parallel fetches across multiple data sources must use `Promise.allSettled`.
> Failed sources log a warning and are skipped; they never throw or prevent other
> sources from loading."

---

### Lesson 10: Add exponential backoff on rate-limited APIs from the start

OpenSky rate limits (429) were added as an afterthought and required multiple
patches. Design for it upfront on any polling API.

```
First 429  → wait 2× the poll interval
Second 429 → wait 4× the poll interval
...
Cap        → never wait more than 5 minutes
Success    → reset backoff to 0
```

Also add a guard to prevent double-fetches during React StrictMode double-mount:
```typescript
const MIN_FETCH_GAP_MS = 11_000
if (now - _lastFetchMs < Math.max(MIN_FETCH_GAP_MS, _backoffMs)) return []
```

---

### Lesson 11: Add abort controllers and timeouts to all serverless fetches

A serverless function that never returns keeps a Vercel function slot open until
it times out (default 10s on hobby tier). Always add an `AbortController` with
an explicit timeout shorter than the platform limit.

```typescript
const ac = new AbortController()
const t = setTimeout(() => ac.abort(), 25_000)
try {
  const res = await fetch(url, { signal: ac.signal })
} finally {
  clearTimeout(t)
}
```

---

## Part 4 — State and Component Architecture

### Lesson 12: Use a single global store as the bridge between imperative and declarative code

When mixing imperative APIs (Cesium, Web Audio, Canvas) with React, never pass
the imperative instance as a prop. Store it in Zustand. This lets non-component
code (hooks, event callbacks, serverless response handlers) read and write state
without being inside React's tree.

```
// Anti-pattern: prop drilling an imperative instance
<DataLayer viewer={viewer} />

// Correct: store it once, read it anywhere
const viewer = useWorldStore(s => s.viewer)
```

**Cursor prompt to include upfront:**
> "Any imperative object (WebGL context, audio node, third-party viewer instance)
> must be stored in Zustand after initialization. No component receives it as a prop.
> All access is via `useWorldStore` selectors."

---

### Lesson 13: Every data layer is a self-contained hook

Keep data fetching, entity lifecycle, and cleanup together in one custom hook
per data source. The hook owns setup, polling, and teardown. No component
manages cleanup directly.

Pattern every hook must follow:
```
useXxxLayer()
  Effect 1: register resources when viewer is ready
            cleanup: remove resources on unmount
  Effect 2: start polling when layer is enabled
            cleanup: cancel in-flight requests, clear intervals
```

**Cursor prompt to include upfront:**
> "Each external data source gets one hook in `src/dataFetchers/`. The hook
> registers resources in one `useEffect` and polls in a second `useEffect`.
> Both effects return cleanup functions. The hook exports nothing — it is
> mounted once in App.tsx and manages itself."

---

## Part 5 — The Master Cursor Prompt (Copy This Into `.cursorrules` or Your First Message)

```
PRODUCTION-FIRST RULES FOR THIS PROJECT:

API & NETWORK
- Before coding any fetch, check the API's CORS policy with curl -I. If CORS is
  not open, plan a Vercel serverless proxy in api/ from the start.
- All external URLs route through src/config/publicApi.ts. Functions return the
  direct URL in DEV and /api/... in production. No data fetcher hardcodes a URL.
- Vercel API routes on Vite use static file paths only — no [...slug] catch-alls.
  One file per exact URL. Shared helpers in api/_lib/.
- All imports inside api/ use .js extensions (TypeScript NodeNext requirement).
- OAuth secrets and sensitive keys are server-only (no VITE_ prefix), only used
  in api/ functions.

ERROR HANDLING
- All parallel fetches use Promise.allSettled. Failures log a warning and are skipped.
- Polling APIs implement exponential backoff on 429. Cap at 5 minutes.
- All serverless fetches use AbortController with a timeout under 25 seconds.

STATE
- Imperative objects (Cesium Viewer, canvas contexts) go in Zustand on init.
  Never passed as props. Accessed via useWorldStore selectors.
- Each data source is one hook in src/dataFetchers/ managing its own lifecycle.

DEPLOY CHECKLIST (run before every first deploy to a new environment)
- All env vars added in Vercel dashboard for Production scope
- API key HTTP referrers updated to include the new domain
- Vercel build logs checked: Functions section lists all expected api/ routes
- Both /api/ endpoints curl-tested before enabling features in the browser
```

---

## Quick Diagnostic Reference

| Error in browser | Root cause | Fix |
|---|---|---|
| `Access-Control-Allow-Origin` blocked | Direct browser fetch to CORS-restricted API | Add serverless proxy in `api/` |
| `404` on `/proxy/...` path | Vite dev proxy path used in production | Add matching `api/` Vercel route |
| `404` on `/api/...` path | Function didn't deploy (TS error) or wrong file path | Check Vercel build logs → Functions |
| `403` from Google/Cesium | API key referrer restriction | Add your domain in the API console |
| `ERR_CONNECTION_CLOSED` | Third-party server dropped connection | Add retry with backoff; use `Promise.allSettled` |
| `TS2835` on imports | Missing `.js` extension in NodeNext context | Add `.js` to all imports inside `api/` |
| Feature works locally, broken in prod | `VITE_*` key missing from Vercel env vars | Add it in Vercel → Settings → Env Variables |
