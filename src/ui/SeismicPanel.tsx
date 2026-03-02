import { useWorldStore } from '../store/useWorldStore'

const FONT = '"VT323","Courier New",monospace'

const ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '1.5rem',
  borderBottom: '1px solid #005c18',
  padding: '4px 0',
}

const KEY_STYLE: React.CSSProperties = {
  color: '#005c18',
  fontSize: '1.1rem',
  letterSpacing: '0.05em',
}

const VAL_STYLE: React.CSSProperties = {
  color: '#00ff41',
  fontSize: '1.1rem',
  textAlign: 'right',
}

function formatTime(ms: number): string {
  return new Date(ms).toUTCString().replace('GMT', 'UTC')
}

function magLabel(mag: number): string {
  if (mag < 2) return `M${mag.toFixed(1)} MINOR`
  if (mag < 4) return `M${mag.toFixed(1)} LIGHT`
  if (mag < 6) return `M${mag.toFixed(1)} MODERATE`
  if (mag < 7) return `M${mag.toFixed(1)} STRONG`
  return `M${mag.toFixed(1)} MAJOR`
}

export default function SeismicPanel() {
  const selected = useWorldStore((s) => s.selectedEntity)
  const setSelected = useWorldStore((s) => s.setSelectedEntity)

  if (selected?.type !== 'seismic') return null

  const m = selected.metadata
  const mag = m.mag as number
  const depth = m.depth_km as number
  const place = m.place as string
  const timeMs = m.time_ms as number

  const rows = [
    { label: 'MAGNITUDE', value: magLabel(mag) },
    { label: 'DEPTH',     value: `${depth.toFixed(1)} KM` },
    { label: 'LOCATION',  value: place.toUpperCase() },
    { label: 'TIME',      value: formatTime(timeMs) },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: 340,
        background: 'rgba(0,0,0,0.92)',
        border: '1px solid #00ff41',
        boxShadow: '0 0 12px rgba(0,255,65,0.25)',
        fontFamily: FONT,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#00ff41',
          color: '#000',
          padding: '2px 8px',
          fontSize: '1rem',
          letterSpacing: '0.08em',
        }}
      >
        <span>SEISMIC EVENT ▮</span>
        <button
          onClick={() => setSelected(null)}
          style={{
            background: 'none',
            border: 'none',
            color: '#000',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            padding: 0,
          }}
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '6px 10px' }}>
        {rows.map((row) => (
          <div key={row.label} style={ROW_STYLE}>
            <span style={KEY_STYLE}>{row.label}</span>
            <span style={{ ...VAL_STYLE, maxWidth: 220, wordBreak: 'break-word', textAlign: 'right' }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '2px 10px',
          borderTop: '1px solid #005c18',
          color: '#005c18',
          fontSize: '0.85rem',
        }}
      >
        SOURCE: USGS EARTHQUAKE HAZARDS PROGRAM
      </div>
    </div>
  )
}
