import { useWorldStore } from '../store/useWorldStore'

export default function SatelliteHUD() {
  const enabled = useWorldStore((s) => s.layers.satellites)
  const count = useWorldStore((s) => s.satelliteCount)

  if (!enabled || count === 0) return null

  return (
    <div
      className="absolute top-4 right-4 pointer-events-none z-50 select-none"
      style={{
        fontFamily: "'VT323', 'Courier New', monospace",
        fontSize: '16px',
        color: '#00FFFF',
        textShadow: '0 0 8px #00FFFF, 0 0 2px #00FFFF',
        letterSpacing: '0.05em',
      }}
    >
      TRACKING: {count} OBJECTS
    </div>
  )
}
