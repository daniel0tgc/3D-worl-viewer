import { useEffect, useRef, useState } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import type { CameraInfo } from '../store/useWorldStore'

// Individual feed panel
function FeedPanel({ info, onClose }: { info: CameraInfo; onClose: () => void }) {
  const [tick, setTick] = useState(() => Date.now())
  const [failed, setFailed] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setFailed(false)
    setTick(Date.now())
    intervalRef.current = setInterval(() => {
      setFailed(false)
      setTick(Date.now())
    }, 60_000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [info.id])

  return (
    <div
      style={{
        width: 220,
        background: 'rgba(0,0,0,0.95)',
        border: '1px solid #00FF41',
        boxShadow: '0 0 10px rgba(0,255,65,0.2)',
        fontFamily: '"VT323","Courier New",monospace',
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#00FF41',
          color: '#000',
          padding: '2px 6px',
          fontSize: '0.85rem',
          letterSpacing: '0.06em',
          lineHeight: 1.4,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
          FEED: {info.id} | STATUS: LIVE
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, padding: 0, marginLeft: 4 }}
          aria-label="Close feed"
        >
          ✕
        </button>
      </div>

      {/* Name */}
      <div style={{ padding: '2px 6px', color: '#005c18', fontSize: '0.8rem', borderBottom: '1px solid #003310', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {info.name.toUpperCase()}
      </div>

      {/* Image / fallback */}
      <div style={{ width: '100%', height: 140, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {failed ? (
          <span style={{ color: '#005c18', fontSize: '0.85rem', letterSpacing: '0.05em' }}>FEED UNAVAILABLE</span>
        ) : (
          <img
            key={tick}
            src={`${info.snapshotUrl}?t=${tick}`}
            alt={`Camera ${info.id}`}
            onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '1px 6px', color: '#005c18', fontSize: '0.75rem', borderTop: '1px solid #003310' }}>
        REFRESH: 60S ▮
      </div>
    </div>
  )
}

// Container for all open panels
export default function CameraPanel() {
  const openIds = useWorldStore((s) => s.openCameraIds)
  const registry = useWorldStore((s) => s.cameraRegistry)
  const closeCamera = useWorldStore((s) => s.closeCamera)

  if (openIds.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'row',
        gap: 8,
        alignItems: 'flex-end',
        pointerEvents: 'auto',
      }}
    >
      {openIds.map((id) => {
        const info = registry[id]
        if (!info) return null
        return (
          <FeedPanel
            key={id}
            info={info}
            onClose={() => closeCamera(id)}
          />
        )
      })}
    </div>
  )
}
