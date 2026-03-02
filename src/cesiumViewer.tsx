import { useEffect, useRef } from 'react'
import { Ion, Viewer as CesiumViewerClass } from 'cesium'
import { useWorldStore } from './store/useWorldStore'
import { initCesiumProviders } from './lib/initCesiumProviders'

const ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN
if (ION_TOKEN) {
  Ion.defaultAccessToken = ION_TOKEN
}

export default function CesiumViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const setViewer = useWorldStore((s) => s.setViewer)
  const viewerRef = useRef<CesiumViewerClass | null>(null)

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    async function initViewer() {
      const viewer = new CesiumViewerClass(containerRef.current!, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        navigationInstructionsInitiallyVisible: false,
      })

      // Suppress Cesium's built-in credit display — the HUD will handle attribution
      ;(viewer.creditDisplay.container as HTMLElement).style.display = 'none'

      // Store viewer immediately so the LoadingScreen can fade and data fetchers
      // can start. Provider failures (bad API key, network error) are recoverable —
      // the globe still renders without terrain/imagery.
      viewerRef.current = viewer
      setViewer(viewer)

      try {
        await initCesiumProviders(viewer)
      } catch (err) {
        console.warn('[WorldView] Provider init failed — running without terrain', err)
      }
    }

    initViewer().catch(console.error)

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [setViewer])

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen"
      style={{ background: '#000' }}
    />
  )
}
