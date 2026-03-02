import * as satellite from 'satellite.js'
import {
  Cartesian3,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  CustomDataSource,
  Entity,
  LabelStyle,
  NearFarScalar,
  PolylineGlowMaterialProperty,
  VerticalOrigin,
} from 'cesium'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SatRecord {
  name: string
  satrec: satellite.SatRec
  lastPathMs: number
}

export interface SatEntity {
  entity: Entity
  record: SatRecord
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAT_COLOR = Color.fromCssColorString('#00FFFF')
const PATH_STEP_MS = 30_000          // 30 s between orbit path samples
const PATH_DURATION_MS = 90 * 60 * 1000 // 90 minutes total
export const PATH_REBUILD_MS = 60_000

// ---------------------------------------------------------------------------
// Propagation helpers
// ---------------------------------------------------------------------------

export function propagatePosition(
  satrec: satellite.SatRec,
  date: Date,
): Cartesian3 | null {
  const pv = satellite.propagate(satrec, date)
  if (!pv.position || typeof pv.position === 'boolean') return null

  const gmst = satellite.gstime(date)
  const geo = satellite.eciToGeodetic(pv.position as satellite.EciVec3<satellite.Kilometers>, gmst)

  const lon = satellite.degreesLong(geo.longitude)
  const lat = satellite.degreesLat(geo.latitude)
  const altM = geo.height * 1000 // km → m

  if (!isFinite(lon) || !isFinite(lat) || !isFinite(altM)) return null
  return Cartesian3.fromDegrees(lon, lat, altM)
}

export function buildOrbitPath(satrec: satellite.SatRec, nowMs: number): Cartesian3[] {
  const positions: Cartesian3[] = []
  const steps = PATH_DURATION_MS / PATH_STEP_MS // 180

  for (let i = 0; i <= steps; i++) {
    const t = new Date(nowMs + i * PATH_STEP_MS)
    const pos = propagatePosition(satrec, t)
    if (pos) positions.push(pos)
  }
  return positions
}

// ---------------------------------------------------------------------------
// Entity management
// ---------------------------------------------------------------------------

export function upsertSatelliteEntity(
  ds: CustomDataSource,
  record: SatRecord,
  existing: SatEntity | undefined,
  nowMs: number,
): SatEntity {
  const pos = propagatePosition(record.satrec, new Date(nowMs))
  const shouldRebuildPath = nowMs - record.lastPathMs > PATH_REBUILD_MS

  if (existing) {
    if (pos) {
      existing.entity.position = new ConstantPositionProperty(pos)
    }
    if (shouldRebuildPath) {
      const path = buildOrbitPath(record.satrec, nowMs)
      if (existing.entity.polyline && path.length > 1) {
        existing.entity.polyline.positions = new ConstantProperty(path)
      }
      record.lastPathMs = nowMs
    }
    return { entity: existing.entity, record }
  }

  // Create new entity
  const orbitPath = buildOrbitPath(record.satrec, nowMs)
  record.lastPathMs = nowMs

  const entity = ds.entities.add(
    new Entity({
      id: record.name,
      position: pos ? new ConstantPositionProperty(pos) : undefined,
      point: {
        pixelSize: 6,
        color: SAT_COLOR,
        outlineColor: SAT_COLOR.withAlpha(0.4),
        outlineWidth: 4,
        scaleByDistance: new NearFarScalar(1e6, 1.6, 1e8, 0.6),
      },
      label: {
        text: record.name,
        font: "13px 'VT323', 'Courier New', monospace",
        fillColor: SAT_COLOR,
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: VerticalOrigin.BOTTOM,
        pixelOffset: new Cartesian3(0, -10, 0) as unknown as import('cesium').Cartesian2,
        scaleByDistance: new NearFarScalar(1e6, 1.2, 2e7, 0.5),
        translucencyByDistance: new NearFarScalar(1e7, 1.0, 5e7, 0.0),
      },
      polyline: {
        positions: new ConstantProperty(orbitPath),
        width: 1,
        material: new PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: SAT_COLOR.withAlpha(0.5),
        }),
        followSurface: false,
      },
    }),
  )

  return { entity, record }
}
