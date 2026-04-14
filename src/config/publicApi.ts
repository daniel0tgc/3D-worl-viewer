/** CONUS bounding box — matches OpenSky poll in opensky.ts */
const OPENSKY_STATES_QUERY = 'lamin=24&lomin=-125&lamax=50&lomax=-65'

/**
 * OpenSky states URL: direct to opensky-network.org in dev (VITE_ OAuth in browser);
 * same-origin `/api/opensky/...` in production (Vercel serverless + server-only OAuth).
 */
export function getOpenSkyStatesUrl(): string {
  if (import.meta.env.DEV) {
    return `https://opensky-network.org/api/states/all?${OPENSKY_STATES_QUERY}`
  }
  return `/api/opensky/states/all?${OPENSKY_STATES_QUERY}`
}

/** NYC DOT JSON: dev uses Vite `/proxy/nyctmc`; production uses Vercel `/api/proxy/nyctmc`. */
export function getNycCamerasUrl(): string {
  if (import.meta.env.DEV) return '/proxy/nyctmc/api/cameras'
  return '/api/proxy/nyctmc/api/cameras'
}
