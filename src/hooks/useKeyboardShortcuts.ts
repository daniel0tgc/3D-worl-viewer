import { useEffect } from 'react'
import { useWorldStore } from '../store/useWorldStore'

export function useKeyboardShortcuts(): void {
  const setVisualMode    = useWorldStore((s) => s.setVisualMode)
  const toggleLayer      = useWorldStore((s) => s.toggleLayer)
  const setSelectedEntity = useWorldStore((s) => s.setSelectedEntity)

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      // Never steal input from form elements
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Don't fire when a button, anchor, or select has focus — prevents double-toggle
      // after clicking a sidebar layer button (the button stays focused until blur)
      const active = document.activeElement
      if (
        active instanceof HTMLButtonElement ||
        active instanceof HTMLAnchorElement ||
        active instanceof HTMLSelectElement
      ) return

      // Ignore repeated keydown events (key held down)
      if (e.repeat) return

      switch (e.key.toLowerCase()) {
        case 'f':
          setVisualMode('FLIR')
          break
        case 'n':
          setVisualMode('NIGHT_VIS')
          break
        case 'a':
          toggleLayer('aircraft')
          break
        case 's':
          toggleLayer('satellites')
          break
        case 'c':
          toggleLayer('cameras')
          break
        case 'e':
          toggleLayer('seismic')
          break
        case 'escape':
          setSelectedEntity(null)
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setVisualMode, toggleLayer, setSelectedEntity])
}
