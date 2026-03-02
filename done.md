# WorldView — Build Progress

## Architecture Decisions

- Stack: Vite + React + TypeScript + CesiumJS + Zustand
- Styling: Tailwind + custom CSS (VT323 font, #00FF41 phosphor green, #000 bg)
- Desktop wrapper: Tauri 2.0 (optional, web-first for now)
- No backend — fully client-side, CORS proxy only if needed for cam feeds
- API keys stored in .env (never committed)

## Phases Complete

<!-- Update this as you go -->

- [x] Phase 1: Project scaffold + Tailwind theme
- [x] Phase 2: Cesium globe + Google 3D Tiles
- [x] Phase 3: CRT/FLIR visual effects
- [x] Phase 4: OpenSky aircraft tracking
- [x] Phase 5: Satellite tracking (Celestrak + satellite.js)
- [x] Phase 6: Austin traffic cams
- [x] Phase 7: HUD interface panels
- [x] Phase 8: Seismic data layer (USGS)
- [x] Phase 9: Entity selection + Intel panel
- [x] Phase 10: Performance + polish

## Deviations from Plan

### Phase 7
- `SatelliteHUD.tsx` demounted from App.tsx (left on disk); satellite count now lives in `LayerSidebar` via `satelliteCount` store field
- `AircraftPanel` and `CameraPanel` kept structurally intact and mounted inside `HUD.tsx` without restructuring their internals; full layout consolidation deferred to Phase 9 IntelPanel
- Crosshair reticle implemented as two inline `div`s inside `HUD.tsx` (no separate file — too small to warrant one)
- `addConsoleEvent` wired into all three data fetchers (`opensky.ts`, `satellites.ts`, `cameras.ts`); triggers after successful data load/poll
- Debug `console.log` statements removed from `opensky.ts` poll loop to stay within 200-line file limit; HUD count display makes them redundant
- `LayerSidebar` uses inline styles (not Tailwind classes) for consistency with `TopBanner` and `ConsoleLog` which cannot use Tailwind JIT inside `style={}` blocks

### Phase 6 (updated post-Phase 7)
- Panels are not draggable — deferred to Phase 9/10 polish (requires drag event handling or a library)
- Camera icon is canvas-drawn (`20×20px`, phosphor `#00FF41`) consistent with aircraft billboard approach; no external icon asset needed
- `setCameraRegistry` populates Zustand once on fetch; `CameraPanel` reads purely from store with no prop drilling
- Snapshot `<img>` tag bypasses CORS (browser allows cross-origin image display without CORS headers); `fetch()` not used for snapshots
- **Camera sources**: NYC DOT removed — `webcams.nyctmc.org/api/cameras` returns no `Access-Control-Allow-Origin` header so browser `fetch()` is CORS-blocked; replaced with Caltrans D4 (Bay Area) alongside D7 (LA) and Austin; `fetchAllCameras()` uses `Promise.allSettled` so one failing source never blocks others
- **Austin snapshot URL**: uses `screenshot_address` field from the Socrata API response directly (`https://cctv.austinmobility.io/image/{id}.jpg`); that host returns 403 so Austin panels show "FEED UNAVAILABLE" — billboards still appear on the globe
- **Caltrans D4 + D7**: fully working end-to-end — JSON API has `Access-Control-Allow-Origin: *` and images also serve with CORS
- `CameraInfo` in Zustand store gained `snapshotUrl: string`; `CameraPanel` uses `info.snapshotUrl` instead of a hardcoded URL pattern, making it source-agnostic
- Billboard cap raised to 300 total across all three sources combined (was 200 Austin-only)

### Phase 5
- Starlink group deferred: `state.layers.starlink` added to `LayerState` (defaults to `false`) but no fetcher wired yet — toggle reserved for future expansion
- `requestAnimationFrame` replaced with `setInterval(5000)` — rAF at 60fps would be wasteful; 5s matches the spec's update intent
- Orbital path rebuilt every 60s (not every 5s position tick) — rebuilding 180-point polylines at 5s for 25+ satellites is unnecessarily expensive
- Satellite entities use `PointGraphics` (not `BillboardGraphics`) with cyan `#00FFFF` glow outline to visually distinguish from aircraft
- `SatelliteHUD.tsx` displays "TRACKING: N OBJECTS" in top-right corner; count driven by `setSatelliteCount` in Zustand; hidden when layer is off or count is 0
- `selectedEntityChanged` listener populates the existing `SelectedEntity` store with satellite orbital metadata (period, inclination, eccentricity) for Phase 9 IntelPanel integration

### Phase 4 (updated post-Phase 7)
- No GLTF model available; using canvas-drawn green arrow billboard (`28×28px`, phosphor `#00FF41`, rotated by `-trueTrack` radians). Ground aircraft shown in grey.
- `SampledPositionProperty` replaced with `ConstantPositionProperty` (trails removed for performance).
- Entity management uses `CustomDataSource('aircraft')` so `ds.show = false` hides all aircraft without destroying entities when the layer is toggled off.
- Click detection uses `viewer.selectedEntityChanged` (Cesium-native event, no `ScreenSpaceEventHandler` conflict with future layers). Aircraft state stored in module-level `metaRef` keyed by icao24.
- `AircraftPanel.tsx` is a Phase 4 interim panel; will be superseded/complemented by `IntelPanel.tsx` in Phase 9.
- Async `poll()` is guarded by a `cancelled` flag so in-flight fetches are discarded on unmount or layer-toggle.
- Fetch capped to CONUS bounding box; max 300 entities sorted by `lastContact`; 0.01° move threshold to skip Cesium rebuilds.
- OAuth2 client-credentials flow added (`src/dataFetchers/opensky.auth.ts`). Token is cached and refreshed 60 s before expiry. Falls back to anonymous if credentials are absent.
- **Poll interval increased to 20s** (was 15s) to reduce 429 rate; **exponential backoff added**: first 429 waits 40s, doubles each time, capped at 5 minutes, resets to 0 on any successful response.

### Phase 3
- Added a second "sweep" div (moving gradient line) in `CRTOverlay.tsx` for extra CRT authenticity — not in spec but purely additive
- Scanline + vignette CSS is tuned per `VisualMode` (EO/FLIR/NIGHT_VIS) so the overlay reinforces the active shader mode visually
- `@keyframes` defined directly in `index.css` rather than only in `tailwind.config.ts` to ensure the animations are always available regardless of Tailwind's purging
- `PostProcessStage` lifecycle (init/cleanup) handled inside `CRTOverlay.tsx` so the shader stages are cleaned up when the component unmounts; toggle functions are safe no-ops if called before init

### Phase 2
- OSM Buildings only added in the fallback path (Cesium World Terrain + Bing). Google Photorealistic 3D Tiles already include full building geometry; adding OSM Buildings on top causes z-fighting. CONTEXT.md lists OSM Buildings as step (3) without specifying conditional, but this is the correct technical approach.
- `Terrain.fromWorldTerrain()` used instead of deprecated `createWorldTerrainAsync()` (modern Cesium 1.108+ API)

### Phase 1
- Scaffolded project manually (Vite CLI cancelled on non-empty directory) — structure is identical to `react-ts` template
- Used `vite-plugin-cesium@1.2.23` (latest available; `^1.3.1` does not exist yet)
- `satellite.js` v5 ships its own type declarations; `@types/satellite.js` was removed (package does not exist on npm)
- Tailwind v3 used (v4 alpha; CSS-variable theme defined in `src/index.css` + `tailwind.config.ts`)
- `CesiumViewer` is a shell component only (Phase 2 wires up imagery/terrain)

## Required Keys

| Variable | Used In |
|---|---|
| `VITE_CESIUM_ION_TOKEN` | Phase 2 – Cesium Ion terrain / tiles |
| `VITE_GOOGLE_MAPS_API_KEY` | Phase 2 – Google Photorealistic 3D Tiles |
| `VITE_OPENSKY_CLIENT_ID` | Phase 4 – OpenSky OAuth2 client credentials |
| `VITE_OPENSKY_CLIENT_SECRET` | Phase 4 – OpenSky OAuth2 client credentials |

## Camera Source Expansion (post-Phase 6)

**Changes:**
- `CAP_PER_SOURCE` raised from 130 → 250 per source
- Added **NYC DOT** cameras (`webcams.nyctmc.org/api/cameras`, 949 cameras): fetched via a Vite dev-server proxy (`/proxy/nyctmc`) to bypass the API's missing `Access-Control-Allow-Origin` header — no separate backend required
- Added **Caltrans D3** (Sacramento / Central Valley, ~269 cameras)
- Added **Caltrans D11** (San Diego, confirmed CORS-enabled)
- Total live sources: Austin + NYC + Caltrans D3/D4/D7/D11 (6 sources)
- **Boston/MA**: No public CORS-enabled camera API found. Mass511 is a closed SPA; MassDOT has no open JSON feed. Can be added later with a lightweight serverless proxy.

**Note:** The Vite proxy (`server.proxy` in `vite.config.ts`) only applies during `npm run dev`. Production deployments will need a separate reverse-proxy rule for the `/proxy/nyctmc` path.

## Phase 8 Notes

- Source: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson` (no API key required, CORS-enabled)
- Refresh: every 5 minutes (`REFRESH_MS = 300_000`)
- Cap: 500 events max, magnitude >= 1.0 filtered at parse time
- Color scale: green < M2, yellow M2–4, orange M4–6, red M6+
- Point size: 6 / 14 / 24 / 40 px by magnitude tier
- Pulsing ring: `EllipseGraphics` with two `CallbackProperty` instances (4-second period), max radius 30 km → 350 km scaled by magnitude
- Stale-entity pruning on each refresh: events that drop off the 24-hour window are removed
- `seismicCount` added to Zustand store; shown in `LayerSidebar` SEISMIC row when layer is active
- No deviations from CONTEXT.md

## Phase 9 Notes

- `IntelPanel.tsx` (~190 lines): fixed right-side slide-in panel (`intel-slide-in` keyframe); metadata rows stagger in via `intel-row-in` with 0.05s delay per row; uses `key={selected.id}` to re-trigger animation on each new entity selection
- All four data fetchers (`opensky.ts`, `satellites.ts`, `seismic.ts`, `cameras.ts`) already called `setSelectedEntity` — no changes needed to those files beyond `cameras.ts`
- **`AircraftPanel.tsx` and `SeismicPanel.tsx`**: kept on disk, removed from `HUD.tsx`; `IntelPanel` supersedes both
- **Camera click flow**: `cameras.ts` now calls `setSelectedEntity({ type:'camera', ... })` instead of `openCamera()`; an "OPEN FEED" button inside `IntelPanel` calls `openCamera()` to add the feed to `CameraPanel`'s multi-feed view
- **TRACK button**: toggles `viewer.trackedEntity` to follow any entity type; resets on entity change or panel close
- **DESIGNATE TARGET button**: draws a canvas red corner-bracket billboard at the entity's current position; toggle off to remove; cleaned up on selection change or panel unmount
- Aircraft metadata is a snapshot from the time of click (live-updating from `metaRef` deferred to Phase 10 polish)
- `cursor-blink` keyframe not added — `blink` keyframe already in `index.css` covers the blinking cursor animation

## Phase 10 Notes

- **LoadingScreen** (`src/ui/LoadingScreen.tsx`, ~80 lines): fades out once `viewer` is set in Zustand AND all 6 status lines have cycled (one per 600 ms); minimum ~3.6 s display time; uses existing `console-slide` + `blink` keyframes
- **Keyboard shortcuts** (`src/hooks/useKeyboardShortcuts.ts`): F=FLIR, N=NIGHT_VIS, A/S/C/E toggle layers, Escape=deselect; cleans up `keydown` listener on unmount
- **Aircraft live-update in IntelPanel**: `aircraftMetaStore` exported from `opensky.ts` as a module-level `Map<string, AircraftState>`; polled every 3 s while panel is open; heading added to initial click metadata
- **OpenSky 429 console event**: `OPENSKY RATE LIMITED — BACKOFF ACTIVE` now appears in the HUD console on each 429 response (exponential backoff logic unchanged from Phase 8 fixes)
- **Entity clustering** (`setupClustering()` in `opensky.entities.ts`): `EntityCluster.enabled = true`, `pixelRange = 40`, `minimumClusterSize = 4`; cluster billboard is a canvas-drawn green circle with count (consistent with terminal theme); no Cesium `PinBuilder` needed
- **`intel.utils.ts`** (`src/ui/intel.utils.ts`): extracted `getRows()` from IntelPanel to reduce its line count from 234 → ~190; also exports `aircraftMetaToRecord()` helper used by the live-update interval
- **`.env.example`**: all 4 required keys already documented (`VITE_CESIUM_ION_TOKEN`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_OPENSKY_CLIENT_ID`, `VITE_OPENSKY_CLIENT_SECRET`); no changes needed
- LoadingScreen fade-out is not gated on first API fetch — gated on `viewer` ready + lines shown (fetch timing is non-deterministic due to OpenSky rate limits)

## Known Issues

<!-- Track bugs to fix later -->
