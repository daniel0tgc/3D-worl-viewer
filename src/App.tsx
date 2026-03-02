import CesiumViewer from './cesiumViewer'
import CRTOverlay from './effects/CRTOverlay'
import { useAircraftLayer } from './dataFetchers/opensky'
import { useSatelliteLayer } from './dataFetchers/satellites'
import { useCameraLayer } from './dataFetchers/cameras'
import { useSeismicLayer } from './dataFetchers/seismic'
import HUD from './ui/HUD'
import ModeBar from './ui/ModeBar'
import LoadingScreen from './ui/LoadingScreen'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export default function App() {
  useAircraftLayer()
  useSatelliteLayer()
  useCameraLayer()
  useSeismicLayer()
  useKeyboardShortcuts()

  return (
    // border-radius + overflow:hidden gives the bezel-curve CRT illusion
    <div className="relative w-screen h-screen overflow-hidden rounded-[6px] bg-[var(--color-bg)]">
      <CesiumViewer />
      <CRTOverlay />
      <HUD />
      <ModeBar />
      <LoadingScreen />
    </div>
  )
}
