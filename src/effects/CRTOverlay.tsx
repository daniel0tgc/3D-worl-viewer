import { useEffect } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import type { VisualMode } from '../store/useWorldStore'
import {
  initFlirShaderStages,
  cleanupShaderStages,
  enableFLIR,
  enableNightVision,
  enableNormalEO,
} from './flirShader'

const MODE_CSS: Record<VisualMode, { scanline: string; vignette: string }> = {
  EO:        { scanline: 'rgba(0,255,65,0.03)', vignette: 'rgba(0,0,0,0.65)' },
  FLIR:      { scanline: 'rgba(0,255,65,0.07)', vignette: 'rgba(0,0,0,0.72)' },
  NIGHT_VIS: { scanline: 'rgba(0,255,65,0.05)', vignette: 'rgba(0,0,0,0.78)' },
}

export default function CRTOverlay() {
  const viewer     = useWorldStore((s) => s.viewer)
  const visualMode = useWorldStore((s) => s.visualMode)

  useEffect(() => {
    if (!viewer) return
    initFlirShaderStages(viewer)
    return () => cleanupShaderStages(viewer)
  }, [viewer])

  useEffect(() => {
    switch (visualMode) {
      case 'FLIR':      enableFLIR();        break
      case 'NIGHT_VIS': enableNightVision(); break
      default:          enableNormalEO();    break
    }
  }, [visualMode])

  const { scanline, vignette } = MODE_CSS[visualMode]

  return (
    <>
      {/* Scanlines + vignette */}
      <div
        aria-hidden
        className="animate-flicker"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
          background: [
            `repeating-linear-gradient(0deg, transparent 0px, transparent 2px, ${scanline} 2px, ${scanline} 4px)`,
            `radial-gradient(ellipse at 50% 50%, transparent 56%, ${vignette} 100%)`,
          ].join(', '),
        }}
      />

      {/* Moving scanline sweep */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9998,
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(0,255,65,0.015) 50%, transparent 100%)',
          backgroundSize: '100% 8px',
          animation: 'crt-sweep 8s linear infinite',
        }}
      />
    </>
  )
}
