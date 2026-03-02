import { useState, useCallback } from 'react'
import { useWorldStore, type HudLayout } from '../store/useWorldStore'
import { setParamUniforms } from '../effects/paramShader'

const FONT   = "'VT323','Courier New',monospace"
const TEAL   = '#00b4b4'
const DIM    = '#1a4a4a'
const BG     = 'rgba(10,10,10,0.92)'

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 11, color: TEAL, letterSpacing: '0.1em', marginBottom: 6,
      borderBottom: `1px solid ${DIM}`, paddingBottom: 3 }}>
      {text}
    </div>
  )
}

function PanelSlider({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6ababa', marginBottom: 2 }}>
        <span>{label}</span><span>{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: TEAL, cursor: 'pointer' }} />
    </div>
  )
}

function ToggleBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: FONT, fontSize: 13, cursor: 'pointer', padding: '3px 10px',
      background: active ? 'rgba(0,180,180,0.15)' : 'transparent',
      color: active ? TEAL : '#3a6a6a',
      border: `1px solid ${active ? TEAL : DIM}`,
      letterSpacing: '0.05em', borderRadius: 4,
      textShadow: active ? `0 0 6px ${TEAL}` : 'none',
    }}>{active ? '■' : '□'} {label}</button>
  )
}

export default function RightPanel() {
  const viewer          = useWorldStore((s) => s.viewer)
  const visualMode      = useWorldStore((s) => s.visualMode)
  const hudLayout       = useWorldStore((s) => s.hudLayout)
  const setHudLayout    = useWorldStore((s) => s.setHudLayout)
  const hudVisible      = useWorldStore((s) => s.hudVisible)
  const setHudVisible   = useWorldStore((s) => s.setHudVisible)
  const panopticEnabled = useWorldStore((s) => s.panopticEnabled)
  const togglePanoptic  = useWorldStore((s) => s.togglePanoptic)
  const panopticDensity = useWorldStore((s) => s.panopticDensity)
  const setPanopticDensity = useWorldStore((s) => s.setPanopticDensity)

  const [collapsed,    setCollapsed]    = useState(false)
  const [bloomOn,      setBloomOn]      = useState(false)
  const [bloomVal,     setBloomVal]     = useState(30)
  const [sharpenOn,    setSharpenOn]    = useState(false)
  const [sharpenVal,   setSharpenVal]   = useState(50)
  const [pixelation,   setPixelation]   = useState(0)
  const [distortion,   setDistortion]   = useState(0)
  const [instability,  setInstability]  = useState(0)

  const applyBloom = useCallback((enabled: boolean, val: number) => {
    if (!viewer) return
    const bloom = viewer.scene.postProcessStages.bloom
    bloom.enabled = enabled
    if (enabled) {
      bloom.uniforms['delta']   = 0.5 + (val / 100) * 2.0
      bloom.uniforms['sigma']   = 1.0 + (val / 100) * 4.0
      bloom.uniforms['stepSize'] = 1.0 + (val / 100) * 3.0
    }
  }, [viewer])

  const applySharpen = useCallback((enabled: boolean) => {
    if (!viewer) return
    viewer.scene.postProcessStages.fxaa.enabled = enabled
  }, [viewer])

  const applyParams = useCallback((px: number, dist: number, inst: number) => {
    setParamUniforms({
      pixelation:  px   / 100,
      distortion:  dist / 100,
      instability: inst / 100,
    })
  }, [])

  if (collapsed) {
    return (
      <button onClick={() => setCollapsed(false)} style={{
        position: 'fixed', top: '50%', right: 0, transform: 'translateY(-50%)',
        zIndex: 1001, fontFamily: FONT, fontSize: 18, color: TEAL, cursor: 'pointer',
        background: BG, border: `1px solid ${DIM}`, borderRight: 'none',
        padding: '12px 6px', borderRadius: '6px 0 0 6px', writingMode: 'vertical-rl',
        letterSpacing: '0.1em',
      }}>CONTROLS</button>
    )
  }

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, width: 280, height: '100vh',
      background: BG, borderLeft: `1px solid ${DIM}`, zIndex: 1001,
      fontFamily: FONT, overflowY: 'auto', pointerEvents: 'auto',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${DIM}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#3a6a6a', letterSpacing: '0.1em' }}>ACTIVE STYLE</div>
          <div style={{ fontSize: 18, color: TEAL, letterSpacing: '0.08em' }}>{visualMode}</div>
        </div>
        <button onClick={() => setCollapsed(true)} style={{
          fontFamily: FONT, fontSize: 16, color: '#3a6a6a', cursor: 'pointer',
          background: 'none', border: 'none', padding: 4,
        }}>✕</button>
      </div>

      <div style={{ padding: '10px 12px', flex: 1 }}>
        {/* Bloom */}
        <SectionLabel text="POST-PROCESS" />
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <ToggleBtn label="BLOOM" active={bloomOn} onClick={() => {
            const next = !bloomOn; setBloomOn(next); applyBloom(next, bloomVal)
          }} />
          <ToggleBtn label="SHARPEN" active={sharpenOn} onClick={() => {
            const next = !sharpenOn; setSharpenOn(next); applySharpen(next)
          }} />
        </div>
        {bloomOn && <PanelSlider label="Bloom Intensity" value={bloomVal} onChange={(v) => {
          setBloomVal(v); applyBloom(true, v)
        }} />}
        {sharpenOn && <PanelSlider label="Sharpen Strength" value={sharpenVal} onChange={(v) => {
          setSharpenVal(v)
        }} />}

        {/* HUD Layout */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel text="HUD LAYOUT" />
          <select value={hudLayout} onChange={(e) => setHudLayout(e.target.value as HudLayout)}
            style={{
              width: '100%', fontFamily: FONT, fontSize: 14, color: TEAL,
              background: '#0d0d0d', border: `1px solid ${DIM}`, padding: '4px 8px',
              cursor: 'pointer', marginBottom: 8,
            }}>
            <option value="TACTICAL">Tactical</option>
            <option value="MINIMAL">Minimal</option>
            <option value="FULL">Full</option>
          </select>
          <button onClick={() => setHudVisible(!hudVisible)} style={{
            width: '100%', fontFamily: FONT, fontSize: 14, cursor: 'pointer',
            padding: '5px 0', background: hudVisible ? 'transparent' : 'rgba(0,180,180,0.12)',
            color: hudVisible ? '#3a6a6a' : TEAL,
            border: `1px solid ${hudVisible ? DIM : TEAL}`, borderRadius: 4,
          }}>{hudVisible ? 'CLEAN UI' : 'RESTORE HUD'}</button>
        </div>

        {/* Panoptic */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel text="PANOPTIC" />
          <ToggleBtn label="PANOPTIC" active={panopticEnabled} onClick={togglePanoptic} />
          {panopticEnabled && (
            <div style={{ marginTop: 8 }}>
              <PanelSlider label="Density" value={panopticDensity} onChange={setPanopticDensity} />
            </div>
          )}
        </div>

        {/* Parameters */}
        <div style={{ marginTop: 14 }}>
          <SectionLabel text="PARAMETERS" />
          <PanelSlider label="Pixelation" value={pixelation} onChange={(v) => {
            setPixelation(v); applyParams(v, distortion, instability)
          }} />
          <PanelSlider label="Distortion" value={distortion} onChange={(v) => {
            setDistortion(v); applyParams(pixelation, v, instability)
          }} />
          <PanelSlider label="Instability" value={instability} onChange={(v) => {
            setInstability(v); applyParams(pixelation, distortion, v)
          }} />
        </div>
      </div>
    </div>
  )
}
