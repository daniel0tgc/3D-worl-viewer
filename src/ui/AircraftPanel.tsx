import { useWorldStore } from '../store/useWorldStore'

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

interface DataRow {
  label: string
  value: string
}

export default function AircraftPanel() {
  const selected = useWorldStore((s) => s.selectedEntity)
  const setSelected = useWorldStore((s) => s.setSelectedEntity)

  if (selected?.type !== 'aircraft') return null

  const m = selected.metadata
  const callsign = m.callsign as string
  const altFt = m.altitude_ft as number
  const speedKts = m.speed_kts as number
  const country = m.origin_country as string
  const onGround = m.on_ground as boolean

  const rows: DataRow[] = [
    { label: 'ICAO24',  value: selected.id.toUpperCase() },
    { label: 'ALT',     value: onGround ? 'ON GROUND' : `${altFt.toLocaleString()} FT` },
    { label: 'SPD',     value: onGround ? '— KTS'     : `${speedKts} KTS` },
    { label: 'ORIGIN',  value: country.toUpperCase() },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        width: 280,
        background: 'rgba(0,0,0,0.92)',
        border: '1px solid #00ff41',
        boxShadow: '0 0 12px rgba(0,255,65,0.25)',
        fontFamily: '"VT323", "Courier New", monospace',
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
        <span>AIRCRAFT: {callsign}</span>
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
            <span style={VAL_STYLE}>{row.value}</span>
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
        STATUS: LIVE ▮
      </div>
    </div>
  )
}
