import {
  Entity,
  BillboardGraphics,
  LabelGraphics,
  LabelStyle,
  ConstantPositionProperty,
  DistanceDisplayCondition,
  NearFarScalar,
  Cartesian2,
  Cartesian3,
  Color,
  Math as CesiumMath,
  type CustomDataSource,
  type EntityCluster,
} from 'cesium'

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export interface AircraftState {
  icao24: string
  callsign: string
  originCountry: string
  lon: number
  lat: number
  altitudeM: number
  onGround: boolean
  velocityMs: number
  trueTrack: number
  lastContact: number
}

export interface AircraftTrack {
  entity: Entity
  lastSeen: number
  // posHistory removed: path trails disabled for performance
}

// ---------------------------------------------------------------------------
// Canvas arrow — drawn once, reused for all billboard images
// ---------------------------------------------------------------------------

let _arrowDataUrl: string | null = null

function getArrowUrl(): string {
  if (_arrowDataUrl) return _arrowDataUrl
  const size = 28
  const cx = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    console.error('[WorldView] Could not get 2D canvas context for aircraft arrow')
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
  ctx.fillStyle = '#00FF41'
  // Fuselage pointing up (north = 0°)
  ctx.beginPath()
  ctx.moveTo(cx, 2)
  ctx.lineTo(cx + 3, 13)
  ctx.lineTo(cx + 2, 24)
  ctx.lineTo(cx, 21)
  ctx.lineTo(cx - 2, 24)
  ctx.lineTo(cx - 3, 13)
  ctx.closePath()
  ctx.fill()
  // Wings
  ctx.beginPath()
  ctx.moveTo(cx - 3, 13)
  ctx.lineTo(cx - 13, 18)
  ctx.lineTo(cx - 11, 20)
  ctx.lineTo(cx, 15)
  ctx.lineTo(cx + 11, 20)
  ctx.lineTo(cx + 13, 18)
  ctx.lineTo(cx + 3, 13)
  ctx.fill()
  _arrowDataUrl = canvas.toDataURL()
  return _arrowDataUrl
}

// ---------------------------------------------------------------------------
// Entity upsert — path trails removed; plain Cartesian3 position is
// far cheaper than rebuilding a SampledPositionProperty every poll.
// ---------------------------------------------------------------------------

export function upsertAircraftEntity(
  ds: CustomDataSource,
  state: AircraftState,
  track: AircraftTrack | undefined,
): AircraftTrack {
  const nowMs = Date.now()
  const altM = state.onGround ? 0 : Math.max(state.altitudeM, 100)
  const pos = Cartesian3.fromDegrees(state.lon, state.lat, altM)

  const acftColor = state.onGround
    ? Color.fromCssColorString('#888888')
    : Color.fromCssColorString('#00FF41')

  const billboard = new BillboardGraphics({
    image: getArrowUrl(),
    rotation: -CesiumMath.toRadians(state.trueTrack),
    width: 24,
    height: 24,
    color: acftColor,
    scaleByDistance: new NearFarScalar(1e5, 1.2, 1.5e7, 0.6),
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
  })

  if (track) {
    track.entity.position = new ConstantPositionProperty(pos)
    track.entity.billboard = billboard
    return { entity: track.entity, lastSeen: nowMs }
  }

  // Log first entity creation so we can confirm coordinates in the console
  if (ds.entities.values.length === 0) {
    console.log(
      '[WorldView] First aircraft entity — lon:', state.lon,
      'lat:', state.lat,
      'altM:', altM,
      'icao24:', state.icao24,
    )
  }

  const entity = ds.entities.add(
    new Entity({
      id: state.icao24,
      position: pos,
      billboard,
      label: new LabelGraphics({
        text: state.callsign,
        font: '14px "VT323", monospace',
        fillColor: Color.fromCssColorString('#00FF41'),
        outlineColor: Color.BLACK,
        outlineWidth: 2,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(16, -4),
        distanceDisplayCondition: new DistanceDisplayCondition(0, 1_500_000),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      }),
      // PathGraphics omitted: polyline trails are expensive at 300+ entities
    }),
  )

  return { entity, lastSeen: nowMs }
}

// ---------------------------------------------------------------------------
// Entity clustering helpers
// ---------------------------------------------------------------------------

export function buildClusterIcon(count: number): string {
  const c = document.createElement('canvas')
  c.width = 36; c.height = 36
  const g = c.getContext('2d')
  if (!g) return ''
  g.fillStyle = 'rgba(0,0,0,0.75)'
  g.beginPath(); g.arc(18, 18, 16, 0, Math.PI * 2); g.fill()
  g.strokeStyle = '#00FF41'; g.lineWidth = 1.5
  g.beginPath(); g.arc(18, 18, 16, 0, Math.PI * 2); g.stroke()
  g.fillStyle = '#00FF41'
  g.font = 'bold 14px "VT323", monospace'
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillText(String(count), 18, 19)
  return c.toDataURL()
}

export function setupClustering(ds: CustomDataSource): void {
  const cluster = ds.clustering as EntityCluster
  cluster.enabled = true
  cluster.pixelRange = 40
  cluster.minimumClusterSize = 4
  cluster.clusterEvent.addEventListener((clusteredEntities, clusterDisplay) => {
    try {
      clusterDisplay.label.show = false
      clusterDisplay.point.show = false
      clusterDisplay.billboard.show = true
      const icon = buildClusterIcon(clusteredEntities.length)
      if (icon) clusterDisplay.billboard.image = icon
      clusterDisplay.billboard.width = 36
      clusterDisplay.billboard.height = 36
      clusterDisplay.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY
    } catch (err) {
      console.warn('[WorldView] Cluster event handler error', err)
    }
  })
}
