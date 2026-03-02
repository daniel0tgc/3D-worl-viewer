import { useWorldStore } from '../../store/useWorldStore'

const FONT = "'VT323','Courier New',monospace"
const GREEN = '#00FF41'
const DIM = '#005c18'

interface LayerRow {
  key: 'aircraft' | 'satellites' | 'cameras' | 'seismic' | 'grid'
  label: string
  count?: number
}

function ToggleRow({ row, active, onToggle }: { row: LayerRow; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => { onToggle(); (e.currentTarget as HTMLButtonElement).blur() }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: FONT,
        fontSize: 15,
        color: active ? GREEN : DIM,
        textShadow: active ? `0 0 6px ${GREEN}` : 'none',
        letterSpacing: '0.05em',
        padding: '3px 0',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 11, lineHeight: 1 }}>{active ? '■' : '□'}</span>
      <span>
        {row.label}
        {row.count !== undefined && active && (
          <span style={{ color: DIM, fontSize: 13 }}> — {row.count}</span>
        )}
      </span>
    </button>
  )
}

export default function LayerSidebar() {
  const layers = useWorldStore((s) => s.layers)
  const toggleLayer = useWorldStore((s) => s.toggleLayer)
  const aircraftCount = useWorldStore((s) => s.aircraftCount)
  const satelliteCount = useWorldStore((s) => s.satelliteCount)
  const seismicCount = useWorldStore((s) => s.seismicCount)

  const rows: LayerRow[] = [
    { key: 'aircraft',   label: 'AIRCRAFT',   count: aircraftCount },
    { key: 'satellites', label: 'SATELLITES', count: satelliteCount },
    { key: 'cameras',    label: 'CAMERAS' },
    { key: 'seismic',    label: 'SEISMIC',    count: seismicCount },
    { key: 'grid',       label: 'GRID' },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: 70,
        left: 0,
        width: 160,
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid #003310',
        borderLeft: 'none',
        padding: '8px 10px',
        fontFamily: FONT,
        pointerEvents: 'auto',
      }}
    >
      {/* Layer header */}
      <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.08em', marginBottom: 6, borderBottom: `1px solid ${DIM}`, paddingBottom: 4 }}>
        LAYERS
      </div>

      {rows.map((row) => (
        <ToggleRow
          key={row.key}
          row={row}
          active={layers[row.key]}
          onToggle={() => toggleLayer(row.key)}
        />
      ))}

    </div>
  )
}
