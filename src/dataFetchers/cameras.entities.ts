import {
  BillboardGraphics,
  Cartesian3,
  Color,
  ConstantPositionProperty,
  CustomDataSource,
  Entity,
  NearFarScalar,
} from 'cesium'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CameraRecord {
  id: string
  name: string
  lat: number
  lon: number
}

// ---------------------------------------------------------------------------
// Billboard icon
// ---------------------------------------------------------------------------

let _iconUrl: string | null = null

function buildCameraIcon(): string {
  if (_iconUrl) return _iconUrl

  const size = 20
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.strokeStyle = '#00FF41'
  ctx.fillStyle = '#00FF41'
  ctx.lineWidth = 1.5

  // Camera body
  ctx.strokeRect(2, 6, 12, 9)
  // Lens circle
  ctx.beginPath()
  ctx.arc(8, 10, 3, 0, Math.PI * 2)
  ctx.stroke()
  // Viewfinder bump
  ctx.fillRect(12, 8, 4, 2)
  // Flash dot
  ctx.beginPath()
  ctx.arc(15, 7, 1, 0, Math.PI * 2)
  ctx.fill()

  _iconUrl = canvas.toDataURL()
  return _iconUrl
}

// ---------------------------------------------------------------------------
// Entity management
// ---------------------------------------------------------------------------

export function upsertCameraEntity(
  ds: CustomDataSource,
  record: CameraRecord,
  existing?: Entity,
): Entity {
  const pos = Cartesian3.fromDegrees(record.lon, record.lat, 0)

  if (existing) {
    existing.position = new ConstantPositionProperty(pos)
    return existing
  }

  return ds.entities.add(
    new Entity({
      id: record.id,
      position: new ConstantPositionProperty(pos),
      billboard: new BillboardGraphics({
        image: buildCameraIcon(),
        width: 20,
        height: 20,
        color: Color.fromCssColorString('#00FF41'),
        scaleByDistance: new NearFarScalar(1e4, 1.4, 5e6, 0.5),
        translucencyByDistance: new NearFarScalar(1e6, 1.0, 8e6, 0.0),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      }),
    }),
  )
}
