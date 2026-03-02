import { useEffect, useRef, useState } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import { getRows, aircraftMetaToRecord } from './intel.utils'
import { aircraftMetaStore } from '../dataFetchers/opensky'
import type { Entity, Viewer } from 'cesium'

const FONT = '"VT323","Courier New",monospace'
const GREEN = '#00FF41'
const DIM = '#005c18'

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function findEntity(viewer: Viewer, id: string): Entity | undefined {
  const direct = viewer.entities.getById(id)
  if (direct) return direct
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const e = viewer.dataSources.get(i).entities.getById(id)
    if (e) return e
  }
  return undefined
}

function buildTargetingIcon(): string {
  const c = document.createElement('canvas')
  c.width = 56; c.height = 56
  const g = c.getContext('2d')!
  g.strokeStyle = '#FF2020'; g.lineWidth = 2.5
  const m = 6, l = 16
  g.beginPath(); g.moveTo(m, m + l); g.lineTo(m, m); g.lineTo(m + l, m); g.stroke()
  g.beginPath(); g.moveTo(56 - m - l, m); g.lineTo(56 - m, m); g.lineTo(56 - m, m + l); g.stroke()
  g.beginPath(); g.moveTo(m, 56 - m - l); g.lineTo(m, 56 - m); g.lineTo(m + l, 56 - m); g.stroke()
  g.beginPath(); g.moveTo(56 - m - l, 56 - m); g.lineTo(56 - m, 56 - m); g.lineTo(56 - m, 56 - m - l); g.stroke()
  return c.toDataURL()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BTN: React.CSSProperties = {
  fontFamily: FONT, fontSize: 14, cursor: 'pointer',
  padding: '3px 10px', background: 'transparent',
  border: `1px solid ${GREEN}`, color: GREEN, letterSpacing: '0.05em',
}

export default function IntelPanel() {
  const viewer      = useWorldStore((s) => s.viewer)
  const selected    = useWorldStore((s) => s.selectedEntity)
  const setSelected = useWorldStore((s) => s.setSelectedEntity)
  const openCamera  = useWorldStore((s) => s.openCamera)

  const designateRef = useRef<Entity | null>(null)
  const [tracking,   setTracking]   = useState(false)
  const [designated, setDesignated] = useState(false)
  const [tick, setTick] = useState(() => Date.now())

  // Reset buttons + clean up targeting billboard when selection changes
  useEffect(() => {
    if (designateRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(designateRef.current)
      designateRef.current = null
    }
    if (viewer && !viewer.isDestroyed()) viewer.trackedEntity = undefined
    setTracking(false)
    setDesignated(false)
  }, [selected?.id, viewer])

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (designateRef.current && viewer && !viewer.isDestroyed()) {
        viewer.entities.remove(designateRef.current)
      }
      if (viewer && !viewer.isDestroyed()) viewer.trackedEntity = undefined
    }
  }, [viewer])

  // Camera snapshot tick
  useEffect(() => {
    if (selected?.type !== 'camera') return
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [selected?.type, selected?.id])

  // Aircraft live-update: refresh metadata from the module-level store every 3s
  useEffect(() => {
    if (selected?.type !== 'aircraft') return
    const id = setInterval(() => {
      const fresh = aircraftMetaStore.get(selected.id)
      if (!fresh) return
      setSelected({
        id: selected.id,
        type: 'aircraft',
        metadata: aircraftMetaToRecord(selected.id, fresh),
      })
    }, 3_000)
    return () => clearInterval(id)
  }, [selected?.type, selected?.id, setSelected])

  if (!viewer || !selected) return null

  const rows = getRows(selected)

  function handleTrack() {
    const entity = findEntity(viewer!, selected!.id)
    if (!entity) return
    if (tracking) {
      viewer!.trackedEntity = undefined
      setTracking(false)
    } else {
      viewer!.trackedEntity = entity
      setTracking(true)
    }
  }

  function handleDesignate() {
    if (!viewer) return
    if (designated) {
      if (designateRef.current) {
        viewer.entities.remove(designateRef.current)
        designateRef.current = null
      }
      setDesignated(false)
      return
    }
    const entity = findEntity(viewer, selected!.id)
    const pos = entity?.position?.getValue(viewer.clock.currentTime)
    if (!pos) return
    designateRef.current = viewer.entities.add({
      position: pos,
      billboard: { image: buildTargetingIcon(), width: 56, height: 56, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    })
    setDesignated(true)
  }

  const snapshotUrl = selected.type === 'camera' ? String(selected.metadata.snapshotUrl) : ''

  return (
    <div
      key={selected.id}
      style={{
        position: 'fixed', top: 0, right: 0, width: 380, height: '100vh',
        background: 'rgba(0,0,0,0.93)', borderLeft: `1px solid ${GREEN}`,
        boxShadow: `-4px 0 20px rgba(0,255,65,0.15)`,
        fontFamily: FONT, zIndex: 1000, pointerEvents: 'auto',
        display: 'flex', flexDirection: 'column',
        animation: 'intel-slide-in 0.25s ease-out both',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ background: GREEN, color: '#000', padding: '4px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', letterSpacing: '0.08em', fontSize: 18, flexShrink: 0 }}>
        <span>
          ▶ {selected.type.toUpperCase()} / {selected.id.toUpperCase().slice(0, 18)}
          <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 2 }}>▮</span>
        </span>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }} aria-label="Close">✕</button>
      </div>

      {/* Metadata rows */}
      <div style={{ padding: '8px 12px', flex: 1 }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex', justifyContent: 'space-between', gap: '1rem',
              borderBottom: `1px solid ${DIM}`, padding: '5px 0',
              animation: 'intel-row-in 0.15s ease-out both',
              animationDelay: `${0.08 + i * 0.05}s`,
            }}
          >
            <span style={{ color: DIM, fontSize: 15, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{row.label}</span>
            <span style={{ color: GREEN, fontSize: 15, textAlign: 'right', wordBreak: 'break-word', maxWidth: 230 }}>{row.value}</span>
          </div>
        ))}

        {/* Camera live feed */}
        {selected.type === 'camera' && (
          <div style={{ marginTop: 10, width: '100%', height: 200, background: '#000', border: `1px solid ${DIM}`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'intel-row-in 0.15s ease-out both', animationDelay: `${0.08 + rows.length * 0.05}s` }}>
            <img
              key={tick}
              src={`${snapshotUrl}?t=${tick}`}
              alt="camera feed"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={(e) => {
                const el = e.target as HTMLImageElement
                el.style.display = 'none'
                el.parentElement!.style.color = DIM
              }}
            />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${DIM}`, display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        <button onClick={handleTrack} style={{ ...BTN, background: tracking ? GREEN : 'transparent', color: tracking ? '#000' : GREEN }}>
          {tracking ? 'UNTRACK ■' : 'TRACK ▶'}
        </button>
        <button onClick={handleDesignate} style={{ ...BTN, color: designated ? '#FF4500' : GREEN, borderColor: designated ? '#FF4500' : GREEN }}>
          {designated ? '✛ DESIGNATED' : '✛ DESIGNATE'}
        </button>
        {selected.type === 'camera' && (
          <button onClick={() => openCamera(selected.id)} style={BTN}>OPEN FEED</button>
        )}
      </div>
    </div>
  )
}
