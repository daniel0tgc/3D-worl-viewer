import { useEffect, useRef } from 'react'
import { CustomDataSource, defined } from 'cesium'
import { useWorldStore } from '../store/useWorldStore'
import { getOpenSkyStatesUrl } from '../config/publicApi'
import { upsertAircraftEntity, setupClustering, type AircraftState, type AircraftTrack } from './opensky.entities'
import { getAuthHeader } from './opensky.auth'

/** Module-level map so IntelPanel can read live aircraft state between polls */
export const aircraftMetaStore = new Map<string, AircraftState>()
const POLL_MS = 20_000
const STALE_MS = 30_000
const MAX_ENTITIES = 300
const MOVE_THRESHOLD = 0.01
const MIN_FETCH_GAP_MS = 11_000  // StrictMode double-mount guard

type RawState = Array<string | number | boolean | null>

interface OpenSkyResponse {
  time: number
  states: RawState[] | null
}

function parseState(raw: RawState): AircraftState | null {
  const lon = raw[5] as number | null
  const lat = raw[6] as number | null
  if (lon === null || lat === null) return null

  const callsign = ((raw[1] as string | null) ?? '').trim()
  return {
    icao24: raw[0] as string,
    callsign: callsign || (raw[0] as string),
    originCountry: raw[2] as string,
    lon,
    lat,
    altitudeM: (raw[7] as number | null) ?? 0,
    onGround: raw[8] as boolean,
    velocityMs: (raw[9] as number | null) ?? 0,
    trueTrack: (raw[10] as number | null) ?? 0,
    lastContact: raw[4] as number,
  }
}

let _lastFetchMs = 0
let _backoffMs = 0  // grows on each 429; resets on success

async function fetchStates(): Promise<AircraftState[]> {
  const now = Date.now()
  if (now - _lastFetchMs < Math.max(MIN_FETCH_GAP_MS, _backoffMs)) return []
  _lastFetchMs = now
  const headers = import.meta.env.DEV ? await getAuthHeader() : {}
  const res = await fetch(getOpenSkyStatesUrl(), { headers })
  if (res.status === 429) {
    _backoffMs = Math.min((_backoffMs || POLL_MS) * 2, 300_000)
    throw new Error('OpenSky 429')
  }
  if (!res.ok) throw new Error(`OpenSky ${res.status}`)
  _backoffMs = 0
  const data = (await res.json()) as OpenSkyResponse
  if (!data.states) return []
  return data.states.flatMap((raw) => {
    const s = parseState(raw)
    return s ? [s] : []
  })
}

export function useAircraftLayer(): void {
  const viewer = useWorldStore((s) => s.viewer)
  const enabled = useWorldStore((s) => s.layers.aircraft)
  const setSelectedEntity = useWorldStore((s) => s.setSelectedEntity)
  const setAircraftCount = useWorldStore((s) => s.setAircraftCount)
  const addConsoleEvent = useWorldStore((s) => s.addConsoleEvent)

  const dsRef = useRef<CustomDataSource | null>(null)
  const tracksRef = useRef<Map<string, AircraftTrack>>(new Map())
  const metaRef = useRef<Map<string, AircraftState>>(new Map())

  // Set up data source + click handler once when viewer mounts
  useEffect(() => {
    if (!viewer) return

    const ds = new CustomDataSource('aircraft')
    viewer.dataSources.add(ds).catch(console.error)
    try { setupClustering(ds) } catch (err) { console.warn('[WorldView] EntityCluster setup failed', err) }
    dsRef.current = ds

    const removeListener = viewer.selectedEntityChanged.addEventListener(
      (entity: typeof viewer.selectedEntity) => {
        if (!defined(entity)) {
          setSelectedEntity(null)
          return
        }
        const state = metaRef.current.get(entity.id as string)
        if (!state) return
        setSelectedEntity({
          id: state.icao24,
          type: 'aircraft',
          metadata: {
            callsign: state.callsign,
            altitude_ft: Math.round(state.altitudeM * 3.28084),
            speed_kts: Math.round(state.velocityMs * 1.944),
            heading: Math.round(state.trueTrack),
            origin_country: state.originCountry,
            on_ground: state.onGround,
          },
        })
      },
    )

    return () => {
      removeListener()
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dsRef.current = null
      tracksRef.current.clear()
      metaRef.current.clear()
    }
  }, [viewer, setSelectedEntity])

  // Start / stop polling when layer is toggled
  useEffect(() => {
    const ds = dsRef.current
    if (ds) ds.show = enabled
    if (!viewer || !enabled) return

    let cancelled = false

    async function poll(): Promise<void> {
      if (!viewer) return

      let states: AircraftState[]
      try {
        states = await fetchStates()
      } catch (err) {
        console.warn('[WorldView] OpenSky fetch failed', err)
        if (err instanceof Error && err.message === 'OpenSky 429') {
          useWorldStore.getState().addConsoleEvent('OPENSKY RATE LIMITED — BACKOFF ACTIVE')
        }
        return
      }

      if (cancelled || !dsRef.current || viewer.isDestroyed()) return

      // Cap: sort by most-recent lastContact, keep top MAX_ENTITIES
      const capped = states
        .sort((a, b) => b.lastContact - a.lastContact)
        .slice(0, MAX_ENTITIES)

      setAircraftCount(capped.length)
      if (capped.length > 0) addConsoleEvent(`AIRCRAFT: ${capped.length} CONTACTS | CONUS`)

      const nowMs = Date.now()

      for (const state of capped) {
        const prevMeta = metaRef.current.get(state.icao24)
        const existing = tracksRef.current.get(state.icao24)

        // Skip full Cesium entity rebuild when aircraft hasn't moved meaningfully
        if (existing && prevMeta) {
          const moved =
            Math.abs(state.lat - prevMeta.lat) > MOVE_THRESHOLD ||
            Math.abs(state.lon - prevMeta.lon) > MOVE_THRESHOLD
          if (!moved) {
            tracksRef.current.set(state.icao24, { ...existing, lastSeen: nowMs })
            metaRef.current.set(state.icao24, state)
            continue
          }
        }

        const track = upsertAircraftEntity(dsRef.current, state, existing)
        tracksRef.current.set(state.icao24, track)
        metaRef.current.set(state.icao24, state)
        aircraftMetaStore.set(state.icao24, state)
      }

      const staleThreshold = nowMs - STALE_MS
      for (const [id, track] of tracksRef.current) {
        if (track.lastSeen < staleThreshold) {
          dsRef.current.entities.removeById(id)
          tracksRef.current.delete(id)
          metaRef.current.delete(id)
          aircraftMetaStore.delete(id)
        }
      }
    }

    poll().catch(console.error)
    const intervalId = setInterval(() => poll().catch(console.error), POLL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [viewer, enabled, setAircraftCount, addConsoleEvent])
}
