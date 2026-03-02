import { useWorldStore } from '../../store/useWorldStore'

const FONT = "'VT323','Courier New',monospace"
const GREEN = '#00FF41'
const DIM = '#005c18'

export default function ConsoleLog() {
  const events = useWorldStore((s) => s.consoleEvents)

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 0,
        width: 380,
        padding: '6px 10px',
        background: 'rgba(0,0,0,0.6)',
        borderRight: `1px solid #003310`,
        borderTop: `1px solid #003310`,
        fontFamily: FONT,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 11, color: DIM, letterSpacing: '0.08em', marginBottom: 4 }}>
        CONSOLE ▮
      </div>
      {events.length === 0 ? (
        <div style={{ fontSize: 13, color: DIM }}>AWAITING DATA...</div>
      ) : (
        events.map((msg, i) => (
          <div
            key={`${msg}-${i}`}
            style={{
              fontSize: 14,
              color: i === 0 ? GREEN : DIM,
              letterSpacing: '0.04em',
              lineHeight: 1.3,
              animation: i === 0 ? 'console-slide 0.2s ease-out' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            &gt; {msg}
          </div>
        ))
      )}
    </div>
  )
}
