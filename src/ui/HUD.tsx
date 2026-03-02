import TopBanner from './hud/TopBanner'
import LayerSidebar from './hud/LayerSidebar'
import ConsoleLog from './hud/ConsoleLog'
import CameraPanel from './CameraPanel'
import IntelPanel from './IntelPanel'

// Reticle crosshair styles — two 1px lines centered in the viewport
const reticleBase: React.CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  background: 'rgba(0,255,65,0.35)',
  pointerEvents: 'none',
}

const reticleH: React.CSSProperties = {
  ...reticleBase,
  width: 20,
  height: 1,
  transform: 'translate(-50%, -50%)',
}

const reticleV: React.CSSProperties = {
  ...reticleBase,
  width: 1,
  height: 20,
  transform: 'translate(-50%, -50%)',
}

export default function HUD() {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <TopBanner />
      <LayerSidebar />
      <ConsoleLog />

      {/* Center crosshair reticle */}
      <div style={reticleH} />
      <div style={reticleV} />

      {/* These panels manage their own positioning and pointer-events */}
      <CameraPanel />
      <IntelPanel />
    </div>
  )
}
