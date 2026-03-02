import { useWorldStore } from '../store/useWorldStore'
import TopBanner from './hud/TopBanner'
import LayerSidebar from './hud/LayerSidebar'
import ConsoleLog from './hud/ConsoleLog'
import CameraPanel from './CameraPanel'
import IntelPanel from './IntelPanel'

const reticleBase: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  background: 'rgba(0,255,65,0.35)',
  pointerEvents: 'none',
}

export default function HUD() {
  const hudVisible = useWorldStore((s) => s.hudVisible)
  const hudLayout  = useWorldStore((s) => s.hudLayout)

  if (!hudVisible) return null

  const showSidebar = hudLayout !== 'MINIMAL'
  const showConsole = hudLayout !== 'MINIMAL'

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <TopBanner />
      {showSidebar && <LayerSidebar />}
      {showConsole && <ConsoleLog />}

      {/* Center crosshair reticle */}
      <div style={{ ...reticleBase, width: 20, height: 1, transform: 'translate(-50%, -50%)' }} />
      <div style={{ ...reticleBase, width: 1, height: 20, transform: 'translate(-50%, -50%)' }} />

      <CameraPanel />
      <IntelPanel />
    </div>
  )
}
