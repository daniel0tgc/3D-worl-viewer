import { useEffect, useRef } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import { detectVehicleLikeRegions } from './panopticHeuristic'

export interface Detection {
  id: string
  label: string
  score: number
  bbox: [number, number, number, number]
}

const ALTITUDE_LIMIT = 3000

function iou(a: [number, number, number, number], b: [number, number, number, number]): number {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3]
  const bx2 = b[0] + b[2], by2 = b[1] + b[3]
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]))
  const inter = ix * iy
  if (inter === 0) return 0
  return inter / (a[2] * a[3] + b[2] * b[3] - inter)
}

function randomId(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

export function usePanopticLayer(): void {
  const viewer           = useWorldStore((s) => s.viewer)
  const panopticEnabled  = useWorldStore((s) => s.panopticEnabled)
  const panopticDensity  = useWorldStore((s) => s.panopticDensity)
  const addConsoleEvent  = useWorldStore((s) => s.addConsoleEvent)
  const setPanopticDetections = useWorldStore((s) => s.setPanopticDetections)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevRef     = useRef<Detection[]>([])
  const altWarned   = useRef(false)

  useEffect(() => {
    if (!viewer || !panopticEnabled) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setPanopticDetections([])
      prevRef.current = []
      altWarned.current = false
      return
    }

    intervalRef.current = setInterval(() => {
      const height = viewer.camera.positionCartographic.height
      if (height >= ALTITUDE_LIMIT) {
        if (!altWarned.current) {
          addConsoleEvent('ALTITUDE TOO HIGH FOR PANOPTIC')
          altWarned.current = true
        }
        return
      }
      altWarned.current = false

      const raw = detectVehicleLikeRegions(viewer.scene.canvas, panopticDensity)
      const assigned: Detection[] = raw.map((d) => {
        const match = prevRef.current.find((p) => iou(p.bbox, d.bbox) > 0.5)
        const id = match ? match.id : `VEH-${randomId()}`
        return { id, label: 'vehicle', score: d.score, bbox: d.bbox }
      })

      prevRef.current = assigned
      setPanopticDetections(assigned)
      addConsoleEvent(`PANOPTIC ACTIVE — ${assigned.length} OBJECTS DETECTED`)
    }, 2000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setPanopticDetections([])
      prevRef.current = []
    }
  }, [viewer, panopticEnabled, panopticDensity, addConsoleEvent, setPanopticDetections])
}
