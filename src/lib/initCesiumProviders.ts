import {
  type Viewer,
  Color,
  Cartesian3,
  JulianDate,
  Math as CesiumMath,
  createGooglePhotorealistic3DTileset,
  createOsmBuildingsAsync,
  IonImageryProvider,
  Terrain,
} from 'cesium'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Continental USA center, ~8 000 km altitude
const USA_VIEW = {
  destination: Cartesian3.fromDegrees(-98.5795, 39.8283, 8_000_000),
  orientation: {
    heading: 0,
    pitch: -CesiumMath.PI_OVER_TWO,
    roll: 0,
  },
}

export async function initCesiumProviders(viewer: Viewer): Promise<void> {
  viewer.scene.backgroundColor = Color.BLACK

  // Anchor clock to current real time so SampledPositionProperty samples
  // (added at JulianDate.now()) are always evaluable. Without this, the
  // clock may start at a default epoch (year 2000) causing entity positions
  // to resolve to undefined with NONE backward extrapolation.
  viewer.clock.currentTime = JulianDate.now()
  viewer.clock.shouldAnimate = true

  if (GOOGLE_KEY) {
    await initGoogleProviders(viewer)
  } else {
    await initFallbackProviders(viewer)
  }

  viewer.camera.setView(USA_VIEW)
}

async function initGoogleProviders(viewer: Viewer): Promise<void> {
  try {
    // Cesium 1.107+ changed the signature: first arg is { key?: string }, not a bare string
    const tileset = await createGooglePhotorealistic3DTileset({ key: GOOGLE_KEY })
    viewer.scene.primitives.add(tileset)
    // Google 3D Tiles are a photogrammetry mesh that replaces the globe entirely.
    // Hiding the globe prevents z-fighting and double-rendering.
    viewer.scene.globe.show = false
  } catch (err) {
    console.warn('[WorldView] Google 3D Tiles unavailable — falling back to Cesium World Terrain', err)
    await initFallbackProviders(viewer)
  }
}

async function initFallbackProviders(viewer: Viewer): Promise<void> {
  // Cesium World Terrain (requires Ion token)
  viewer.scene.setTerrain(
    Terrain.fromWorldTerrain({ requestVertexNormals: true, requestWaterMask: false }),
  )

  // Bing Maps Aerial via Cesium Ion asset ID 2
  viewer.imageryLayers.removeAll()
  const imagery = await IonImageryProvider.fromAssetId(2)
  viewer.imageryLayers.addImageryProvider(imagery)

  viewer.scene.globe.baseColor = Color.BLACK

  // OSM Buildings only meaningful without Google 3D Tiles
  try {
    const osmBuildings = await createOsmBuildingsAsync()
    viewer.scene.primitives.add(osmBuildings)
  } catch (err) {
    console.warn('[WorldView] OSM Buildings unavailable', err)
  }
}
