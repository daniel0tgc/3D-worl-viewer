import {
  CallbackProperty,
  Cartesian3,
  Color,
  ColorMaterialProperty,
  ConstantPositionProperty,
  CustomDataSource,
  EllipseGraphics,
  Entity,
  NearFarScalar,
  PointGraphics,
} from 'cesium'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SeismicRecord {
  id: string
  lat: number
  lon: number
  depth: number   // km below surface
  mag: number
  place: string
  time: number    // epoch ms
}

// ---------------------------------------------------------------------------
// Magnitude → visual properties
// ---------------------------------------------------------------------------

export function magToColor(mag: number): Color {
  if (mag < 2) return Color.GREEN
  if (mag < 4) return Color.YELLOW
  if (mag < 6) return Color.ORANGE
  return Color.RED
}

function magToPointPx(mag: number): number {
  if (mag < 2) return 6
  if (mag < 4) return 14
  if (mag < 6) return 24
  return 40
}

// Max ring expansion radius in meters — scales with magnitude
function magToPulseRadius(mag: number): number {
  if (mag < 2) return 30_000
  if (mag < 4) return 80_000
  if (mag < 6) return 180_000
  return 350_000
}

// ---------------------------------------------------------------------------
// Entity builder
// ---------------------------------------------------------------------------

const PULSE_MS = 4_000

export function buildSeismicEntity(record: SeismicRecord): Entity {
  const pos = Cartesian3.fromDegrees(record.lon, record.lat, 0)
  const col = magToColor(record.mag)
  const maxR = magToPulseRadius(record.mag)
  const px = magToPointPx(record.mag)

  // Cache the radius so both semiMajorAxis and semiMinorAxis always receive
  // the identical value. Cesium evaluates the two properties in separate calls;
  // if Date.now() advances between them, minor could exceed major → crash.
  let _cachedR = 2_000
  const semiMajor = new CallbackProperty(() => {
    _cachedR = 2_000 + ((Date.now() % PULSE_MS) / PULSE_MS) * maxR
    return _cachedR
  }, false)
  const semiMinor = new CallbackProperty(() => _cachedR, false)

  const pulseColor = new CallbackProperty(() => {
    const t = (Date.now() % PULSE_MS) / PULSE_MS
    return col.withAlpha((1 - t) * 0.45)
  }, false)

  return new Entity({
    id: record.id,
    position: new ConstantPositionProperty(pos),
    point: new PointGraphics({
      pixelSize: px,
      color: col,
      outlineColor: col.withAlpha(0.4),
      outlineWidth: 2,
      scaleByDistance: new NearFarScalar(1e5, 1.4, 2e7, 0.5),
    }),
    ellipse: new EllipseGraphics({
      semiMajorAxis: semiMajor,
      semiMinorAxis: semiMinor,
      material: new ColorMaterialProperty(pulseColor),
      fill: true,
      outline: false,
      height: 0,
    }),
  })
}

// ---------------------------------------------------------------------------
// Upsert helper — reuses existing entity to avoid DataSource churn
// ---------------------------------------------------------------------------

export function upsertSeismicEntity(
  ds: CustomDataSource,
  record: SeismicRecord,
  existing?: Entity,
): Entity {
  if (existing && ds.entities.contains(existing)) return existing
  const entity = buildSeismicEntity(record)
  ds.entities.add(entity)
  return entity
}
