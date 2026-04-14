# WorldView — Geospatial Intelligence Dashboard

A browser-based, real-time geospatial intelligence dashboard built on CesiumJS. Renders a photorealistic 3D globe with multiple live data layers—aircraft, satellites, traffic cameras, and seismic events—styled as a classified military terminal from the early 2000s. **Local dev** is static-only (Vite); **Vercel production** adds minimal serverless routes (`/api/opensky`, `/api/proxy/nyctmc`) so OpenSky and NYC DOT work in the browser despite CORS.

---

## Demo Overview

![WorldView screenshot placeholder]

| Layer | Source | Update Rate |
|---|---|---|
| Live Aircraft | OpenSky Network (OAuth2) | 20 s |
| Satellites | Celestrak TLE | 5 s (propagated) |
| Traffic Cameras | Austin, NYC DOT, Caltrans D3/D4/D7/D11 | 60 s (snapshots) |
| Seismic Events | USGS GeoJSON (24-hour feed) | 5 min |

---

## Features

### Globe & Terrain

- **Google Photorealistic 3D Tiles** with full building geometry (Cesium Ion + Google Maps API key).
- Fallback to **Cesium World Terrain + Bing Maps Aerial** when Google key is absent.
- Default view: continental USA at ~8,000 km altitude.

### Data Layers

**Aircraft (OpenSky)**
- Polls live flight states for CONUS bounding box; up to 300 entities.
- Canvas-drawn green arrow billboard rotated to match heading.
- Entity clustering when zoomed out (min cluster size 4, 40 px range).
- OAuth2 client-credentials with token caching; exponential backoff on HTTP 429 (40 s → up to 5 min).
- Click any plane → Intel Panel with callsign, altitude, speed, origin country; live-updating while panel is open.

**Satellites (Celestrak)**
- Fetches TLE sets for ISS/major stations on load.
- Propagates positions every 5 s using `satellite.js`.
- 90-minute orbital path polylines rebuilt every 60 s.
- Cyan point entities with name labels; count shown in HUD.

**Traffic Cameras**
- Sources: Austin (`austintexas.gov`), NYC DOT (`webcams.nyctmc.org` via dev-server proxy), Caltrans D3/D4/D7/D11 — ~1,500+ cameras total.
- Green camera billboard on globe; click → Intel Panel with live JPEG snapshot (refreshed every 60 s).
- Up to 4 simultaneous picture-in-picture feeds in the bottom-right corner.

**Seismic (USGS)**
- All earthquakes ≥ M1.0 from the last 24 hours.
- Point size and color scaled by magnitude (green → yellow → orange → red).
- Animated pulsing ring (`EllipseGraphics`) simulating seismic wave propagation.
- Click → Intel Panel with magnitude, depth, location, time.

### Intel Panel

Slide-in right panel (380 px) on any entity click:

- Staggered typewriter row reveal animation.
- Two-column metadata grid (green-on-black, monospace).
- **TRACK** — locks Cesium camera to follow the entity.
- **DESIGNATE TARGET** — draws a red corner-bracket targeting billboard at the entity's position.
- **OPEN FEED** (cameras only) — adds the feed to the multi-cam panel.
- Aircraft metadata live-polls every 3 s while the panel is open.

### Visual Modes (Mode Bar)

Eight modes selectable from the bottom-center bar; each applies a Cesium `PostProcessStage` and/or CSS filter:

| Mode | Effect |
|---|---|
| Normal | Clean globe, no post-process |
| CRT | Scanlines + vignette + sweep line overlay |
| NVG | Night-vision green GLSL shader |
| FLIR | Desaturate + green thermal palette |
| Anime | Saturation boost + Sobel edge detection |
| Noir | Grayscale + S-curve high contrast |
| Snow | Animated canvas snowflake overlay |
| AI Edit | Pixelation + cyan scan-grid overlay |

### Right Control Panel

Collapsible sidebar (280 px) with:

- **Bloom** toggle + intensity slider (wired to `scene.postProcessStages.bloom`).
- **Sharpen** toggle + intensity slider (FXAA pass).
- **HUD Layout** dropdown: Full / Tactical / Minimal.
- **Panoptic** toggle + density slider (see below).
- **Parameters**: Pixelation, Distortion, Instability sliders fed into an always-on `PostProcessStage` via GLSL uniforms.
- **Clean UI / Restore HUD** button.

### Panoptic Overlay (Phase 13)

When camera altitude drops below 3,000 m and Panoptic is enabled:

- Main-thread pixel analysis (`panopticHeuristic.ts`) scans the Cesium canvas every 2 s.
- Finds bright rectangular regions (vehicle-like contrast pattern) on dark backgrounds.
- Draws `VEH-XXXX` corner-bracket targeting boxes at detected positions.
- Density slider controls bracket count (8–50).
- Stable IDs via IoU > 0.5 matching across frames.
- Console event: `PANOPTIC ACTIVE — N OBJECTS DETECTED`.

### HUD

- **Top-left**: `WORLDVIEW GEOSPATIAL INTELLIGENCE SYSTEM v2.1 | CLASSIFICATION: UNCLASSIFIED // FOR DEMONSTRATION`
- **Top-right**: UTC clock, globe-center coordinates, current altitude.
- **Left sidebar**: Layer toggles (Aircraft, Satellites, Cameras, Seismic) with live counts.
- **Bottom-left console**: Last 8 data events with slide-in animation.
- **Center**: Targeting reticle crosshair.

### Loading Screen

Full-screen initialization sequence with typewriter-style status lines:
`LOADING TERRAIN… ACQUIRING SATELLITES… FETCHING FLIGHT DATA…`
Fades out once the Cesium viewer is ready.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `F` | Toggle FLIR mode |
| `N` | Toggle NVG mode |
| `A` | Toggle aircraft layer |
| `S` | Toggle satellites layer |
| `C` | Toggle cameras layer |
| `E` | Toggle seismic layer |
| `Esc` | Deselect entity / close Intel Panel |

---

## Tech Stack

| Concern | Library |
|---|---|
| 3D Globe | CesiumJS 1.122 |
| React bindings | Resium |
| Build | Vite 6 + vite-plugin-cesium |
| State | Zustand 5 |
| Satellite propagation | satellite.js 5 |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3 + custom CSS |
| Font | VT323 (Google Fonts) |

---

## Prerequisites

- **Node.js** ≥ 18
- A **Cesium Ion** access token — [ion.cesium.com](https://ion.cesium.com)
- A **Google Maps API key** with the *Map Tiles API* enabled — [Google Cloud Console](https://console.cloud.google.com)
- (Optional) **OpenSky Network** OAuth2 client credentials — [opensky-network.org](https://opensky-network.org)

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/<your-handle>/3D-worl-viewer.git
cd 3D-worl-viewer

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in the four keys (see below)

# 4. Start the dev server
npm run dev
```

---

## Environment Variables

Create a `.env` file in the project root (never commit this file):

```env
VITE_CESIUM_ION_TOKEN=your_cesium_ion_token_here
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
VITE_OPENSKY_CLIENT_ID=your_opensky_client_id_here       # optional
VITE_OPENSKY_CLIENT_SECRET=your_opensky_client_secret_here  # optional
```

| Variable | Required | Purpose |
|---|---|---|
| `VITE_CESIUM_ION_TOKEN` | Yes | Cesium Ion terrain and assets |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Photorealistic 3D Tiles |
| `VITE_OPENSKY_CLIENT_ID` | No | OpenSky OAuth2 (higher rate limit) |
| `VITE_OPENSKY_CLIENT_SECRET` | No | OpenSky OAuth2 (higher rate limit) |

If `VITE_OPENSKY_CLIENT_ID` / `VITE_OPENSKY_CLIENT_SECRET` are absent, local dev falls back to anonymous OpenSky requests (lower rate limit; 429 backoff applies).

### Vercel (production)

In the Vercel project dashboard, set the same `VITE_*` variables for the build, and add **server-only** OpenSky credentials (no `VITE_` prefix) so the `/api/opensky` function can attach OAuth without exposing secrets in the client bundle:

```env
OPENSKY_CLIENT_ID=…
OPENSKY_CLIENT_SECRET=…
```

If these are omitted, the production proxy still works using anonymous OpenSky (stricter rate limits). Restrict your **Google Maps API key** by HTTP referrer to include `https://<your-project>.vercel.app/*` and `https://*.vercel.app/*` if you use preview deployments.

---

## Build for Production

```bash
npm run build
# Output in /dist
npm run preview  # Serves the SPA only; /api/* proxies exist on Vercel (use `vercel dev` to test them locally)
```

> **Note:** NYC DOT and OpenSky use Vercel serverless routes under `/api/` (see [vercel.json](vercel.json) and `api/`). `vite preview` does not run those handlers.

---

## Project Structure

```
src/
├── cesiumViewer.tsx          # Cesium viewer init, stored in Zustand
├── App.tsx                   # Root component; mounts all layers and UI
├── dataFetchers/
│   ├── opensky.ts            # Aircraft polling, OAuth2, backoff
│   ├── opensky.auth.ts       # Token caching / refresh
│   ├── opensky.entities.ts   # Aircraft entity creation + clustering
│   ├── satellites.ts         # TLE fetch + propagation loop
│   ├── satellites.entities.ts
│   ├── cameras.ts            # Multi-source camera fetch + billboard
│   ├── cameras.sources.ts    # API source definitions
│   ├── cameras.entities.ts
│   ├── seismic.ts            # USGS GeoJSON polling
│   └── seismic.entities.ts
├── effects/
│   ├── CRTOverlay.tsx        # CSS scanlines, vignette, sweep; shader lifecycle
│   ├── SnowOverlay.tsx       # Canvas snow animation
│   ├── flirShader.ts         # FLIR / NVG / Anime / Noir / AI Edit GLSL stages
│   ├── paramShader.ts        # Always-on Pixelation/Distortion/Instability stage
│   ├── panoptic.ts           # Panoptic detection loop + store updates
│   └── panopticHeuristic.ts  # Canvas pixel analysis (no ML)
├── ui/
│   ├── HUD.tsx               # Main overlay (banner, sidebar, console, reticle)
│   ├── ModeBar.tsx           # Bottom visual-mode switcher
│   ├── RightPanel.tsx        # Collapsible right controls panel
│   ├── IntelPanel.tsx        # Entity detail slide-in panel
│   ├── PanopticOverlay.tsx   # Bracket canvas overlay
│   ├── LoadingScreen.tsx     # Initialization sequence
│   ├── CameraPanel.tsx       # Multi-feed PiP camera panel
│   └── intel.utils.ts        # Metadata row helpers
├── hooks/
│   └── useKeyboardShortcuts.ts
└── store/
    └── useWorldStore.ts      # Central Zustand store
```

---

## Architecture Notes

- **No backend.** All data is fetched client-side. The only server-side component in development is a Vite dev-server proxy for NYC DOT cameras to work around a missing CORS header.
- **Zustand store** is the single source of truth for the viewer instance, selected entity, layer toggles, visual mode, and HUD state. Cesium entities are never passed as props.
- **Data fetchers** are custom React hooks (`useXxxLayer()`) that mount/unmount with the app, clean up intervals and event listeners on unmount, and toggle their `CustomDataSource.show` flag without destroying entities.
- **Performance budget:** total entities kept under 1,500 across all layers via per-source caps and entity clustering.
- **PostProcessStages** are initialized once and cleaned up on visual mode change or component unmount.

---

## Known Issues

- Austin traffic cam snapshots return 403 from `cctv.austinmobility.io`; billboards still appear on the globe but panels show `FEED UNAVAILABLE`.
- Starlink TLE layer is wired in the store but not fetched yet (toggle reserved for a future phase).
- Panoptic bracket count is cosmetic — based on luminance heuristics, not real object detection.

---

## License

For demonstration and portfolio purposes. Not affiliated with any government or intelligence agency.
