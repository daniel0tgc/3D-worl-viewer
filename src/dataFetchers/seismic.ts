import { useEffect, useRef } from 'react'
import { CustomDataSource, defined } from 'cesium'
import { useWorldStore } from '../store/useWorldStore'
import { upsertSeismicEntity, type SeismicRecord } from './seismic.entities'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USGS_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
const REFRESH_MS = 300_000   // 5 minutes
const MAX_EVENTS = 500
const MIN_MAG = 1.0          // skip micro-quakes below this magnitude

// ---------------------------------------------------------------------------
// USGS GeoJSON types
// ---------------------------------------------------------------------------

interface UsgsProperties {
  mag: number | null
  place: string | null
  time: number
  type: string
}

interface UsgsFeature {
  id: string
  geometry: { coordinates: [number, number, number] } | null
  properties: UsgsProperties
}

interface UsgsResponse {
  features: UsgsFeature[]
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseFeatures(json: UsgsResponse): SeismicRecord[] {
  const records: SeismicRecord[] = []
  for (const f of json.features) {
    if (f.properties.type !== 'earthquake') continue
    const mag = f.properties.mag
    if (mag === null || mag < MIN_MAG) continue
    const coords = f.geometry?.coordinates
    if (!coords) continue
    const [lon, lat, depth] = coords
    if (!isFinite(lat) || !isFinite(lon)) continue
    records.push({
      id: f.id,
      lat,
      lon,
      depth: depth ?? 0,
      mag,
      place: f.properties.place ?? 'Unknown location',
      time: f.properties.time,
    })
    if (records.length >= MAX_EVENTS) break
  }
  return records
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSeismicLayer(): void {
  const viewer = useWorldStore((s) => s.viewer)
  const enabled = useWorldStore((s) => s.layers.seismic)
  const setSelectedEntity = useWorldStore((s) => s.setSelectedEntity)
  const setSeismicCount = useWorldStore((s) => s.setSeismicCount)
  const addConsoleEvent = useWorldStore((s) => s.addConsoleEvent)

  const dsRef = useRef<CustomDataSource | null>(null)
  const recordMapRef = useRef<Map<string, SeismicRecord>>(new Map())

  // Set up data source + click listener once when viewer mounts
  useEffect(() => {
    if (!viewer) return

    const ds = new CustomDataSource('seismic')
    ds.show = false
    viewer.dataSources.add(ds).catch(console.error)
    dsRef.current = ds

    const removeListener = viewer.selectedEntityChanged.addEventListener(
      (entity: typeof viewer.selectedEntity) => {
        if (!defined(entity)) {
          setSelectedEntity(null)
          return
        }
        const record = recordMapRef.current.get(entity.id as string)
        if (!record) return
        setSelectedEntity({
          id: record.id,
          type: 'seismic',
          metadata: {
            mag: record.mag,
            depth_km: record.depth,
            place: record.place,
            time_ms: record.time,
          },
        })
      },
    )

    return () => {
      removeListener()
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dsRef.current = null
      recordMapRef.current.clear()
      setSeismicCount(0)
    }
  }, [viewer, setSelectedEntity, setSeismicCount])

  // Load data and manage refresh when layer is toggled
  useEffect(() => {
    const ds = dsRef.current
    if (ds) ds.show = enabled
    if (!viewer || !enabled) return

    let cancelled = false

    async function load(): Promise<void> {
      if (cancelled || !dsRef.current) return
      let json: UsgsResponse
      try {
        const res = await fetch(USGS_URL)
        if (!res.ok) throw new Error(`USGS ${res.status}`)
        json = (await res.json()) as UsgsResponse
      } catch (err) {
        console.warn('[WorldView] USGS seismic fetch failed', err)
        return
      }
      if (cancelled || !dsRef.current) return

      const records = parseFeatures(json)
      const incomingIds = new Set(records.map((r) => r.id))

      // Remove stale entities no longer in the feed
      for (const [id] of recordMapRef.current) {
        if (!incomingIds.has(id)) {
          const entity = dsRef.current.entities.getById(id)
          if (entity) dsRef.current.entities.remove(entity)
          recordMapRef.current.delete(id)
        }
      }

      // Upsert all current records
      for (const record of records) {
        recordMapRef.current.set(record.id, record)
        const existing = dsRef.current.entities.getById(record.id) ?? undefined
        upsertSeismicEntity(dsRef.current, record, existing)
      }

      setSeismicCount(records.length)
      addConsoleEvent(`SEISMIC: ${records.length} EVENTS LOADED`)
    }

    load().catch(console.error)
    const intervalId = setInterval(() => { load().catch(console.error) }, REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [viewer, enabled, setSeismicCount, addConsoleEvent])
}
