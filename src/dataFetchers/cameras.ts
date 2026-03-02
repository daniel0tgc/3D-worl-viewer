import { useEffect, useRef } from 'react'
import { CustomDataSource, defined } from 'cesium'
import { useWorldStore } from '../store/useWorldStore'
import type { CameraInfo } from '../store/useWorldStore'
import { upsertCameraEntity } from './cameras.entities'
import { fetchAllCameras } from './cameras.sources'

export function useCameraLayer(): void {
  const viewer = useWorldStore((s) => s.viewer)
  const enabled = useWorldStore((s) => s.layers.cameras)
  const setCameraRegistry = useWorldStore((s) => s.setCameraRegistry)
  const addConsoleEvent = useWorldStore((s) => s.addConsoleEvent)
  const setSelectedEntity = useWorldStore((s) => s.setSelectedEntity)

  const dsRef = useRef<CustomDataSource | null>(null)
  const entityMapRef = useRef<Map<string, ReturnType<typeof upsertCameraEntity>>>(new Map())

  useEffect(() => {
    if (!viewer) return

    const ds = new CustomDataSource('cameras')
    viewer.dataSources.add(ds).catch(console.error)
    dsRef.current = ds

    const removeListener = viewer.selectedEntityChanged.addEventListener(
      (entity: typeof viewer.selectedEntity) => {
        if (!defined(entity)) return
        const id = entity.id as string
        if (!entityMapRef.current.has(id)) return
        const reg = useWorldStore.getState().cameraRegistry
        const info = reg[id]
        if (info) {
          setSelectedEntity({
            id,
            type: 'camera',
            metadata: { name: info.name, lat: info.lat, lon: info.lon, snapshotUrl: info.snapshotUrl },
          })
        }
      },
    )

    return () => {
      removeListener()
      if (!viewer.isDestroyed()) viewer.dataSources.remove(ds, true)
      dsRef.current = null
      entityMapRef.current.clear()
    }
  }, [viewer, setSelectedEntity])

  useEffect(() => {
    const ds = dsRef.current
    if (ds) ds.show = enabled
    if (!viewer || !enabled) return

    let cancelled = false

    async function load(): Promise<void> {
      let cameras: Awaited<ReturnType<typeof fetchAllCameras>>
      try {
        cameras = await fetchAllCameras()
      } catch (err) {
        console.warn('[WorldView] Camera fetch failed', err)
        return
      }
      if (cancelled || !dsRef.current) return

      const registry: Record<string, CameraInfo> = {}

      for (const record of cameras) {
        const existing = entityMapRef.current.get(record.id)
        const entity = upsertCameraEntity(dsRef.current, record, existing)
        entityMapRef.current.set(record.id, entity)
        registry[record.id] = {
          id: record.id,
          name: record.name,
          lat: record.lat,
          lon: record.lon,
          snapshotUrl: record.snapshotUrl,
        }
      }

      setCameraRegistry(registry)
      addConsoleEvent(`CAMERAS: ${cameras.length} FEEDS | CALTRANS + AUSTIN`)
    }

    load().catch(console.error)

    return () => { cancelled = true }
  }, [viewer, enabled, setCameraRegistry, addConsoleEvent])
}
