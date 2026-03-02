import { useEffect, useRef } from 'react'
import * as satellite from 'satellite.js'
import { CustomDataSource, defined } from 'cesium'
import { useWorldStore } from '../store/useWorldStore'
import {
  upsertSatelliteEntity,
  type SatRecord,
  type SatEntity,
} from './satellites.entities'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELESTRAK_URL =
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle'
const POSITION_INTERVAL_MS = 5_000

// ---------------------------------------------------------------------------
// TLE parsing
// ---------------------------------------------------------------------------

interface TleParsed {
  name: string
  line1: string
  line2: string
}

function parseTle(text: string): TleParsed[] {
  const lines = text
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const result: TleParsed[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    result.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] })
  }
  return result
}

async function fetchTles(): Promise<TleParsed[]> {
  const res = await fetch(CELESTRAK_URL)
  if (!res.ok) throw new Error(`Celestrak ${res.status}`)
  return parseTle(await res.text())
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSatelliteLayer(): void {
  const viewer = useWorldStore((s) => s.viewer)
  const enabled = useWorldStore((s) => s.layers.satellites)
  const setSelectedEntity = useWorldStore((s) => s.setSelectedEntity)
  const setSatelliteCount = useWorldStore((s) => s.setSatelliteCount)
  const addConsoleEvent = useWorldStore((s) => s.addConsoleEvent)

  const dsRef = useRef<CustomDataSource | null>(null)
  const recordsRef = useRef<Map<string, SatRecord>>(new Map())
  const entitiesRef = useRef<Map<string, SatEntity>>(new Map())

  // Set up CustomDataSource + click handler once when viewer mounts
  useEffect(() => {
    if (!viewer) return

    const ds = new CustomDataSource('satellites')
    viewer.dataSources.add(ds).catch(console.error)
    dsRef.current = ds

    const removeListener = viewer.selectedEntityChanged.addEventListener(
      (entity: typeof viewer.selectedEntity) => {
        if (!defined(entity)) {
          setSelectedEntity(null)
          return
        }
        const record = recordsRef.current.get(entity.id as string)
        if (!record) return
        const pv = satellite.propagate(record.satrec, new Date())
        const period =
          record.satrec.no > 0
            ? (2 * Math.PI) / record.satrec.no  // rev/min → minutes
            : 0
        setSelectedEntity({
          id: record.name,
          type: 'satellite',
          metadata: {
            name: record.name,
            period_min: Math.round(period),
            inclination_deg: Math.round(record.satrec.inclo * (180 / Math.PI)),
            eccentricity: Number(record.satrec.ecco.toFixed(6)),
            has_position: pv.position !== false,
          },
        })
      },
    )

    return () => {
      removeListener()
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dsRef.current = null
      recordsRef.current.clear()
      entitiesRef.current.clear()
      setSatelliteCount(0)
    }
  }, [viewer, setSelectedEntity, setSatelliteCount])

  // Load TLEs + start position update loop when layer is toggled on
  useEffect(() => {
    const ds = dsRef.current
    if (ds) ds.show = enabled
    if (!viewer || !enabled) return

    let cancelled = false

    async function load(): Promise<void> {
      let tles: ReturnType<typeof parseTle>
      try {
        tles = await fetchTles()
      } catch (err) {
        console.warn('[WorldView] Celestrak fetch failed', err)
        return
      }
      if (cancelled) return

      for (const { name, line1, line2 } of tles) {
        try {
          const satrec = satellite.twoline2satrec(line1, line2)
          recordsRef.current.set(name, { name, satrec, lastPathMs: 0 })
        } catch {
          console.warn('[WorldView] Bad TLE for', name)
        }
      }
      addConsoleEvent(`SATELLITES: ${recordsRef.current.size} OBJECTS | CELESTRAK`)
    }

    function tick(): void {
      if (cancelled || !dsRef.current || viewer?.isDestroyed()) return
      const nowMs = Date.now()
      for (const [name, record] of recordsRef.current) {
        const existing = entitiesRef.current.get(name)
        const satEntity = upsertSatelliteEntity(dsRef.current!, record, existing, nowMs)
        entitiesRef.current.set(name, satEntity)
      }
      setSatelliteCount(entitiesRef.current.size)
    }

    load()
      .then(() => { if (!cancelled) tick() })
      .catch(console.error)

    const intervalId = setInterval(tick, POSITION_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [viewer, enabled, setSatelliteCount, addConsoleEvent])
}
