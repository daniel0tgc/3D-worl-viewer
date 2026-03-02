import { useWorldStore, type VisualMode } from '../store/useWorldStore'

interface ModeButton {
  id: VisualMode
  icon: string
  label: string
}

const MODES: ModeButton[] = [
  { id: 'NORMAL',  icon: '○',  label: 'Normal'  },
  { id: 'CRT',     icon: '▦',  label: 'CRT'     },
  { id: 'NVG',     icon: '◈',  label: 'NVG'     },
  { id: 'FLIR',    icon: '⊕',  label: 'FLIR'    },
  { id: 'ANIME',   icon: '✦',  label: 'Anime'   },
  { id: 'NOIR',    icon: '◑',  label: 'Noir'    },
  { id: 'SNOW',    icon: '❄',  label: 'Snow'    },
  { id: 'AI_EDIT', icon: '⊡',  label: 'AI Edit' },
]

const FONT = "'VT323','Courier New',monospace"
const ACTIVE_COLOR  = '#00FFFF'
const INACTIVE_COLOR = '#4a8a8a'

export default function ModeBar() {
  const visualMode   = useWorldStore((s) => s.visualMode)
  const setVisualMode = useWorldStore((s) => s.setVisualMode)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        gap: 6,
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.82)',
        border: '1px solid #0a2a2a',
        borderRadius: 12,
        pointerEvents: 'auto',
      }}
    >
      {MODES.map(({ id, icon, label }) => {
        const active = visualMode === id
        return (
          <button
            key={id}
            onClick={(e) => {
              setVisualMode(id)
              ;(e.currentTarget as HTMLButtonElement).blur()
            }}
            title={label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: '7px 13px',
              background: active ? 'rgba(0,255,255,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? ACTIVE_COLOR : '#1a3a3a'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontFamily: FONT,
              color: active ? ACTIVE_COLOR : INACTIVE_COLOR,
              textShadow: active ? `0 0 8px ${ACTIVE_COLOR}` : 'none',
              boxShadow: active ? `0 0 10px rgba(0,255,255,0.18)` : 'none',
              transition: 'all 0.15s ease',
              minWidth: 52,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 11, letterSpacing: '0.06em', lineHeight: 1 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}
