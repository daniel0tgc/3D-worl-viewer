import { useEffect, useState } from 'react'
import { Math as CesiumMath } from 'cesium'
import { useWorldStore } from '../../store/useWorldStore'

const FONT = "'VT323','Courier New',monospace"
const GREEN = '#00FF41'
const DIM = '#005c18'

function formatCoord(deg: number, posLabel: string, negLabel: string): string {
  const abs = Math.abs(deg).toFixed(4)
  return `${abs}° ${deg >= 0 ? posLabel : negLabel}`
}

export default function TopBanner() {
  const viewer = useWorldStore((s) => s.viewer)
  const [timeStr, setTimeStr] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [altKm, setAltKm] = useState<number | null>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const h = String(now.getUTCHours()).padStart(2, '0')
      const m = String(now.getUTCMinutes()).padStart(2, '0')
      const s = String(now.getUTCSeconds()).padStart(2, '0')
      setTimeStr(`${h}:${m}:${s} UTC`)

      if (viewer && !viewer.isDestroyed()) {
        const pos = viewer.camera.positionCartographic
        setLat(CesiumMath.toDegrees(pos.latitude))
        setLon(CesiumMath.toDegrees(pos.longitude))
        setAltKm(pos.height / 1000)
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [viewer])

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '8px 12px',
        fontFamily: FONT,
        pointerEvents: 'none',
      }}
    >
      {/* Top-left: classification banner */}
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 13, color: GREEN, textShadow: `0 0 6px ${GREEN}`, letterSpacing: '0.06em' }}>
          WORLDVIEW GEOSPATIAL INTELLIGENCE SYSTEM v2.1
        </div>
        <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.05em' }}>
          CLASSIFICATION: UNCLASSIFIED // FOR DEMONSTRATION
        </div>
      </div>

      {/* Top-right: clock + coords */}
      <div style={{ textAlign: 'right', lineHeight: 1.5 }}>
        <div style={{ fontSize: 16, color: GREEN, textShadow: `0 0 6px ${GREEN}` }}>
          {timeStr || '--:--:-- UTC'}
        </div>
        {lat !== null && lon !== null && (
          <div style={{ fontSize: 13, color: DIM }}>
            {formatCoord(lat, 'N', 'S')} &nbsp; {formatCoord(lon, 'E', 'W')}
          </div>
        )}
        {altKm !== null && (
          <div style={{ fontSize: 13, color: DIM }}>
            ALT: {altKm.toFixed(0)} KM
          </div>
        )}
      </div>
    </div>
  )
}
