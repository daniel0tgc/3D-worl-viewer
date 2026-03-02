WorldView Build Plan — Cursor Prompts
Phase 1: Project Scaffold

Create a new Vite + React + TypeScript project called worldview. Install dependencies: cesium, resium, satellite.js, tailwindcss, zustand. Configure Vite for CesiumJS (copy-webpack-plugin equivalent for Vite: vite-plugin-cesium). Set up Tailwind with a custom dark theme using CSS variables: background #000, primary text #00FF41 (phosphor green), accent #FF4500, font family 'VT323', 'Courier New', monospace. Create a fullscreen app layout with a <CesiumViewer> component taking 100vw/100vh. Add Google Fonts import for VT323. The app should feel like a classified military intelligence terminal from the early 2000s.

Phase 2: Cesium Globe Core

In src/cesiumViewer.tsx, initialize a CesiumJS viewer with: (1) Google Photorealistic 3D Tiles as the primary imagery/terrain provider using Cesium.createGooglePhotorealistic3DTileset() with a Google Maps API key from .env. (2) Fallback to Cesium World Terrain + Bing Maps Aerial if Google key not present. (3) Enable OSM Buildings 3D Tiles via Cesium.createOsmBuildingsAsync(). (4) Set default view to continental USA at ~8000km altitude. (5) Disable Cesium's default UI widgets (timeline, animation, geocoder) — we'll build custom ones. (6) Set scene background to pure black. Store the viewer instance in a Zustand store under state.viewer.

Phase 3: CRT / Classified Visual Effects

Create src/effects/CRTOverlay.tsx — a React component that renders as a full-viewport overlay (pointer-events: none, z-index: 9999) with: (1) CSS scanlines via repeating-linear-gradient(transparent 0px, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px). (2) A subtle flicker animation (opacity 0.97–1.0, 0.1s alternate infinite). (3) A vignette via radial-gradient darkening edges. (4) A bezel-curve illusion using border-radius + overflow hidden on the viewer container. Also create src/effects/flirShader.ts — a Cesium PostProcessStage that desaturates the globe and applies a green thermal palette (GLSL fragment shader: convert to grayscale, then map luminance → green-tinted thermal). Export toggle functions enableFLIR(), enableNightVision(), enableNormalEO(). Wire to Zustand state.visualMode.

Phase 4: Live Aircraft Tracking (OpenSky)

Create src/dataFetchers/opensky.ts. Poll https://opensky-network.org/api/states/all every 12 seconds. Parse the states array — each entry: [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, baro_altitude, on_ground, velocity, true_track, vertical_rate, ...]. For each aircraft: (1) Create or update a Cesium Entity with a airplane GLTF model (use a simple arrow/cone billboard fallback if no model). (2) Set position using Cesium.Cartesian3.fromDegrees(lon, lat, altitude). (3) Rotate entity to match true_track heading. (4) Maintain a path/trail using SampledPositionProperty showing last 60 seconds. (5) On click, show a HUD panel with callsign, altitude, speed, origin country. Clean up entities that haven't been seen in 30s. Wrap in a useAircraftLayer() hook controlled by Zustand state.layers.aircraft.

Phase 5: Satellite Tracking (Celestrak + satellite.js)

Create src/dataFetchers/satellites.ts. On load, fetch TLE data from https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle (ISS + major stations) and ?GROUP=starlink&FORMAT=tle. Parse TLE text into pairs. Use satellite.twoline2satrec() + satellite.propagate() to compute current ECI position, then convert to geodetic (lat/lon/alt) via satellite.eciToGeodetic(). Create Cesium entities as small glowing dots with label showing satellite name. Update positions every 5 seconds via requestAnimationFrame. Draw orbital path by propagating 90-minute future positions as a polyline. Expose toggle via Zustand state.layers.satellites. Show count in HUD: "TRACKING: 42 OBJECTS".

Phase 6: Austin Traffic Cams

Create src/dataFetchers/austinCams.ts. Fetch camera metadata from https://data.austintexas.gov/resource/b4k4-adkb.json. For each camera with valid lat/lon: (1) Create a Cesium Billboard entity at the camera's location with a small green camera icon. (2) On click, open a floating HUD panel showing a live JPEG snapshot. The snapshot URL pattern is https://cctv.austintexas.gov/cameras/{camera_id}.jpg?t=${Date.now()} — refresh every 60 seconds. (3) Style the panel as a retro terminal window: green border, monospace font, "FEED: [CAM_ID] | STATUS: LIVE" header, timestamp. (4) Show up to 4 camera feeds simultaneously in picture-in-picture panels (bottom-right corner, draggable). Toggle via Zustand state.layers.cameras.

Phase 7: HUD Interface Panels

Create src/ui/HUD.tsx — the main overlay UI. Include: (1) Top-left: "WORLDVIEW GEOSPATIAL INTELLIGENCE SYSTEM v2.1 | CLASSIFICATION: UNCLASSIFIED // FOR DEMONSTRATION" in small green monospace. (2) Top-right: Live clock (UTC), coordinates of globe center, current zoom altitude. (3) Left sidebar: Layer toggles — Aircraft (with live count), Satellites (with count), Traffic Cams, Seismic, Grid. Each toggle is a retro checkbox/button with green glow when active. (4) Bottom-left: Mini "CONSOLE" showing last 8 data events (e.g., "ACQUIRED: UAL234 | ALT: 35000ft | SPD: 487kts"). (5) Visual mode selector: EO / FLIR / NIGHT-VIS as three toggle buttons. (6) Targeting reticle: A subtle crosshair in the center of the globe view. All text uses VT323 font. Animate console entries sliding in from bottom.

Phase 8: Seismic Data Layer

Create src/dataFetchers/seismic.ts. Fetch from USGS GeoJSON feed: https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson (refresh every 5 minutes). For each earthquake feature: (1) Create a Cesium Entity point at the epicenter. (2) Scale the point size by magnitude (mag 1 = 6px, mag 5 = 30px, mag 8+ = 60px). (3) Color by magnitude: green (<2), yellow (2-4), orange (4-6), red (6+). (4) Add a pulsing ring animation using a EllipseGraphics that expands and fades — simulate seismic wave propagation. (5) On click show magnitude, depth, location name, time. Toggle via state.layers.seismic. Add to HUD console: "SEISMIC EVENT: M4.2 | JAPAN | 38km DEPTH".

Phase 9: Entity Selection & Intel Panel

Create src/ui/IntelPanel.tsx. When any entity is clicked (aircraft, satellite, camera, seismic event): (1) Show a slide-in panel from the right side (~380px wide). (2) Panel header: entity type + ID with blinking cursor. (3) Display all available metadata in a two-column key-value grid, monospace, green-on-black. (4) For aircraft: show live-updating altitude/speed/heading. (5) For satellites: show orbital period, inclination, TLE epoch. (6) For cameras: embed the live JPEG feed. (7) Add a "TRACK" button that keeps the Cesium camera following the entity. (8) Add a "DESIGNATE TARGET" button (purely cosmetic — draws a red targeting box around the entity on the globe). Animate panel entrance with a typewriter-style reveal effect.

Phase 10: Performance & Polish

Optimize WorldView for performance and add final polish: (1) Implement entity clustering for aircraft and satellites when zoomed out (Cesium EntityCluster). (2) Add a loading screen: fullscreen black with "INITIALIZING WORLDVIEW SYSTEMS..." typewriter text, progress steps ("LOADING TERRAIN... ACQUIRING SATELLITES... FETCHING FLIGHT DATA..."), then fade out. (3) Add keyboard shortcuts: F = toggle FLIR, N = night vision, A = toggle aircraft, S = satellites, C = cameras, ESC = deselect entity. (4) Add a README.md with setup instructions, required API keys (Google Maps, Cesium Ion token), and how to run. (5) Ensure all setInterval and event listeners are cleaned up on component unmount to prevent memory leaks. (6) Add error boundaries and graceful fallbacks when APIs are unavailable.

Phase 11: Visual Mode Bar + Style Presets

Add a bottom-center mode switcher bar matching the reference: Normal / CRT / NVG / FLIR / Anime / Noir / Snow / AI Edit as icon+label buttons. Each applies a distinct Cesium PostProcessStage or CSS filter combination. Anime = saturated + cel-shading GLSL. Noir = desaturate + high contrast. Snow = particle overlay. Replace the current EO/FLIR/NVG buttons in the left sidebar with this bottom bar.

Phase 12: Right Control Panel

Add a collapsible right sidebar with: Bloom toggle + intensity slider (wire to Cesium bloom post-process). Sharpen toggle + slider. HUD layout selector dropdown (Tactical / Minimal / Full). Panoptic toggle with density slider (cosmetic for now). Parameters section: Sensitivity, Pixelation, Distortion, Instability sliders that feed into the active PostProcessStage uniforms. Match the teal/dark aesthetic from the reference.

Phase 13: Panoptic Vehicle Detection Layer

This is the biggest feature gap from the reference. Implement a panoptic overlay that draws vehicle detection brackets on the globe when zoomed in below 5km altitude. Use TensorFlow.js coco-ssd running on canvas-captured Cesium frames. Label detected objects as "VEH-XXXX" with corner bracket targeting boxes (dashed rectangles, no fill). Only activate when altitude < 5000m to preserve performance. Add "PANOPTIC" toggle to Zustand and the right panel.

Phase 14: Locations Quick-Jump Bar + Scenes

Add a bottom locations bar with preset city buttons: Austin, San Francisco, New York, Tokyo, London, Paris, Dubai, Washington DC. Each flies the Cesium camera to that city at a fixed altitude. Add a "Scenes" panel (bottom-right of reference) with New/Delete/Load/Update Shot buttons that save and restore camera positions using Zustand + localStorage.

Phase 15: Additional Data Layers

Add three new toggleable layers to match the reference: (1) Weather Radar — fetch NOAA NEXRAD composite radar GeoJSON from https://mesonet.agron.iastate.edu/geojson/radar_stations.geojson and overlay as colored precipitation polygons. (2) Street Traffic — fetch OpenStreetMap Overpass API road segments with speed data for major cities and color-code by congestion (green/yellow/red). (3) MGRS Grid — draw a Military Grid Reference System coordinate overlay on the globe surface that updates with camera position, displaying current MGRS coordinates bottom-left like the reference.
