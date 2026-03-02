import { useEffect, useState } from 'react'
import { useWorldStore } from '../store/useWorldStore'

const LINES = [
  'INITIALIZING WORLDVIEW SYSTEMS...',
  'LOADING TERRAIN...',
  'ACQUIRING SATELLITES...',
  'FETCHING FLIGHT DATA...',
  'CALIBRATING INSTRUMENTS...',
  'READY.',
]

const FONT = '"VT323","Courier New",monospace'
const GREEN = '#00FF41'

export default function LoadingScreen() {
  const viewer = useWorldStore((s) => s.viewer)
  const [lineIdx, setLineIdx] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [gone, setGone] = useState(false)

  // Advance through status lines every 600 ms
  useEffect(() => {
    const id = setInterval(() => {
      setLineIdx((i) => Math.min(i + 1, LINES.length - 1))
    }, 600)
    return () => clearInterval(id)
  }, [])

  // Once viewer is ready and all lines shown, begin fade-out
  useEffect(() => {
    if (!viewer || lineIdx < LINES.length - 1) return
    const t = setTimeout(() => setFadeOut(true), 400)
    return () => clearTimeout(t)
  }, [viewer, lineIdx])

  // Remove from DOM after fade completes — use timeout (transition has no animationend)
  useEffect(() => {
    if (!fadeOut) return
    const t = setTimeout(() => setGone(true), 600)
    return () => clearTimeout(t)
  }, [fadeOut])

  if (gone) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, color: GREEN,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        // Block all interaction while visible; once transparent, pass events through
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 24, left: 24, width: 40, height: 40, borderTop: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` }} />
      <div style={{ position: 'absolute', top: 24, right: 24, width: 40, height: 40, borderTop: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` }} />
      <div style={{ position: 'absolute', bottom: 24, left: 24, width: 40, height: 40, borderBottom: `2px solid ${GREEN}`, borderLeft: `2px solid ${GREEN}` }} />
      <div style={{ position: 'absolute', bottom: 24, right: 24, width: 40, height: 40, borderBottom: `2px solid ${GREEN}`, borderRight: `2px solid ${GREEN}` }} />

      <div style={{ textAlign: 'left', minWidth: 420 }}>
        <div style={{ fontSize: 28, letterSpacing: '0.15em', marginBottom: 32, textShadow: `0 0 12px ${GREEN}` }}>
          WORLDVIEW v2.1
        </div>
        {LINES.slice(0, lineIdx + 1).map((line, i) => (
          <div
            key={line}
            style={{
              fontSize: 18, letterSpacing: '0.08em', marginBottom: 8,
              color: i === lineIdx ? GREEN : '#005c18',
              animation: 'console-slide 0.2s ease-out both',
            }}
          >
            {line}
            {i === lineIdx && (
              <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 4 }}>▮</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
