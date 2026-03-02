import { useEffect } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import type { VisualMode } from '../store/useWorldStore'
import {
  initFlirShaderStages,
  cleanupShaderStages,
  enableFLIR,
  enableNightVision,
  enableNormalEO,
  enableAnime,
  enableNoir,
  enableAiEdit,
} from './flirShader'
import { initParamStage, cleanupParamStage } from './paramShader'
import SnowOverlay from './SnowOverlay'

interface ModeCss { scanline: string; vignette: string }

const MODE_CSS: Record<VisualMode, ModeCss> = {
  NORMAL:  { scanline: 'transparent',           vignette: 'rgba(0,0,0,0.55)' },
  CRT:     { scanline: 'rgba(0,255,65,0.04)',   vignette: 'rgba(0,0,0,0.65)' },
  NVG:     { scanline: 'rgba(0,255,65,0.05)',   vignette: 'rgba(0,0,0,0.78)' },
  FLIR:    { scanline: 'rgba(0,255,65,0.07)',   vignette: 'rgba(0,0,0,0.72)' },
  ANIME:   { scanline: 'rgba(120,80,255,0.03)', vignette: 'rgba(0,0,0,0.50)' },
  NOIR:    { scanline: 'rgba(255,255,255,0.03)', vignette: 'rgba(0,0,0,0.80)' },
  SNOW:    { scanline: 'transparent',           vignette: 'rgba(0,10,30,0.45)' },
  AI_EDIT: { scanline: 'rgba(0,220,255,0.03)',  vignette: 'rgba(0,0,0,0.60)' },
}

export default function CRTOverlay() {
  const viewer     = useWorldStore((s) => s.viewer)
  const visualMode = useWorldStore((s) => s.visualMode)

  useEffect(() => {
    if (!viewer) return
    initFlirShaderStages(viewer)
    initParamStage(viewer)
    return () => {
      cleanupShaderStages(viewer)
      cleanupParamStage(viewer)
    }
  }, [viewer])

  useEffect(() => {
    switch (visualMode) {
      case 'FLIR':    enableFLIR();        break
      case 'NVG':     enableNightVision(); break
      case 'ANIME':   enableAnime();       break
      case 'NOIR':    enableNoir();        break
      case 'AI_EDIT': enableAiEdit();      break
      default:        enableNormalEO();    break
    }
  }, [visualMode])

  const { scanline, vignette } = MODE_CSS[visualMode]
  const showSweep = visualMode === 'CRT'

  return (
    <>
      {visualMode === 'SNOW' && <SnowOverlay />}

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

      {showSweep && (
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
      )}
    </>
  )
}
