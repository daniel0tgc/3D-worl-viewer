import type { CameraRecord } from './cameras.entities'
import { getCaltransCctvUrl, getNycCamerasUrl } from '../config/publicApi'

export interface CameraEntry extends CameraRecord {
  snapshotUrl: string
}

// ---------------------------------------------------------------------------
// Austin (Socrata — metadata + screenshot_address field for snapshot URL)
// ---------------------------------------------------------------------------

const AUSTIN_URL = 'https://data.austintexas.gov/resource/b4k4-adkb.json?$limit=100'

interface AustinRaw {
  camera_id?: string
  atd_camera_id?: string
  location_name?: string
  primary_st?: string
  cross_st?: string
  screenshot_address?: string
  location?: { type?: string; coordinates?: [number, number] }
  latitude?: string | number
  longitude?: string | number
}

function parseAustin(data: AustinRaw[]): CameraEntry[] {
  const results: CameraEntry[] = []
  for (const raw of data) {
    const id = raw.camera_id ?? raw.atd_camera_id
    if (!id) continue
    let lat: number | null = null
    let lon: number | null = null
    if (raw.location?.coordinates) {
      lon = raw.location.coordinates[0]; lat = raw.location.coordinates[1]
    } else if (raw.latitude != null && raw.longitude != null) {
      lat = Number(raw.latitude); lon = Number(raw.longitude)
    }
    if (lat === null || lon === null || !isFinite(lat) || !isFinite(lon)) continue
    const name =
      raw.location_name ??
      (raw.primary_st && raw.cross_st ? `${raw.primary_st} @ ${raw.cross_st}` : id)
    // Use screenshot_address from the API if present; fallback URL pattern used only if missing
    const snapshotUrl = raw.screenshot_address ?? `https://cctv.austinmobility.io/image/${id}.jpg`
    results.push({ id, name, lat, lon, snapshotUrl })
  }
  return results
}

async function fetchAustin(): Promise<CameraEntry[]> {
  const res = await fetch(AUSTIN_URL)
  if (!res.ok) throw new Error(`Austin ${res.status}`)
  return parseAustin((await res.json()) as AustinRaw[])
}

// ---------------------------------------------------------------------------
// Caltrans (cwwp2.dot.ca.gov) — CORS-enabled; images also CORS-enabled
// ---------------------------------------------------------------------------

interface CaltransRaw {
  data?: Array<{
    cctv?: {
      index?: string
      location?: { locationName?: string; latitude?: string; longitude?: string }
      inService?: string
      imageData?: { static?: { currentImageURL?: string } }
    }
  }>
}

function parseCaltrans(district: string, payload: CaltransRaw): CameraEntry[] {
  const results: CameraEntry[] = []
  for (const item of payload.data ?? []) {
    const c = item.cctv
    if (!c || c.inService !== 'true') continue
    const imgUrl = c.imageData?.static?.currentImageURL
    if (!imgUrl) continue
    const lat = Number(c.location?.latitude)
    const lon = Number(c.location?.longitude)
    if (!isFinite(lat) || !isFinite(lon)) continue
    const id = `caltrans-${district}-${c.index ?? Math.random()}`
    const name = c.location?.locationName ?? id
    results.push({ id, name, lat, lon, snapshotUrl: imgUrl })
  }
  return results
}

const CALTRANS_RETRIES = 2
const CALTRANS_RETRY_MS = 400

async function fetchCaltrans(district: string): Promise<CameraEntry[]> {
  const url = getCaltransCctvUrl(district)
  let lastErr: unknown
  for (let attempt = 0; attempt <= CALTRANS_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Caltrans ${district} ${res.status}`)
      return parseCaltrans(district, (await res.json()) as CaltransRaw)
    } catch (e) {
      lastErr = e
      const retry =
        attempt < CALTRANS_RETRIES &&
        (e instanceof TypeError ||
          (e instanceof Error && /fetch|network|Failed to fetch/i.test(e.message)))
      if (retry) await new Promise((r) => setTimeout(r, CALTRANS_RETRY_MS * (attempt + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

// ---------------------------------------------------------------------------
// NYC DOT (webcams.nyctmc.org) — no CORS headers on their API, so the Vite
// dev-server proxy at /proxy/nyctmc forwards requests without CORS issues.
// ---------------------------------------------------------------------------

interface NycRaw {
  id?: string
  name?: string
  latitude?: number
  longitude?: number
  isOnline?: string
  imageUrl?: string
}

function parseNyc(data: NycRaw[]): CameraEntry[] {
  const results: CameraEntry[] = []
  for (const c of data) {
    if (!c.id || c.isOnline !== 'true' || !c.latitude || !c.longitude || !c.imageUrl) continue
    if (!isFinite(c.latitude) || !isFinite(c.longitude)) continue
    results.push({
      id: `nyc-${c.id}`,
      name: c.name ?? c.id,
      lat: c.latitude,
      lon: c.longitude,
      snapshotUrl: c.imageUrl,
    })
  }
  return results
}

async function fetchNyc(): Promise<CameraEntry[]> {
  const res = await fetch(getNycCamerasUrl())
  if (!res.ok) throw new Error(`NYC DOT ${res.status}`)
  return parseNyc((await res.json()) as NycRaw[])
}

// ---------------------------------------------------------------------------
// Combined fetcher — 6 sources: Austin + NYC + Caltrans D3/D4/D7/D11
// Per-source cap keeps every city represented even if one source is larger.
// ---------------------------------------------------------------------------

const CAP_PER_SOURCE = 250

export async function fetchAllCameras(): Promise<CameraEntry[]> {
  const sources = [
    fetchAustin(),
    fetchNyc(),
    fetchCaltrans('d3'),  // Sacramento / Central Valley
    fetchCaltrans('d4'),  // Bay Area / SF
    fetchCaltrans('d7'),  // LA area
    fetchCaltrans('d11'), // San Diego
  ]
  const results = await Promise.allSettled(sources)
  const merged: CameraEntry[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') merged.push(...r.value.slice(0, CAP_PER_SOURCE))
    else console.warn('[WorldView] Camera source failed:', r.reason)
  }
  return merged
}
