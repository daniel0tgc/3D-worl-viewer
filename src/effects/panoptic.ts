import { useEffect, useRef } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import PanopticWorker from './panopticWorker?worker'
import type { WorkerDetection } from './panopticWorker'

export interface Detection {
  id: string
  label: string
  score: number
  bbox: [number, number, number, number]
}

const VEHICLE_LABELS = new Set(['car', 'truck', 'bus', 'bicycle', 'motorcycle'])
const ALTITUDE_LIMIT = 5000

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

  const workerRef   = useRef<Worker | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevRef     = useRef<Detection[]>([])
  const busyRef     = useRef(false)
  const altWarned   = useRef(false)

  useEffect(() => {
    if (!viewer || !panopticEnabled) {
      if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null }
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setPanopticDetections([])
      prevRef.current = []
      busyRef.current = false
      altWarned.current = false
      return
    }

    const threshold = 0.7 - (panopticDensity / 100) * 0.4

    const worker = new PanopticWorker()
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<{ detections: WorkerDetection[] }>) => {
      busyRef.current = false
      const raw = e.data.detections ?? []

      const filtered = raw.filter(
        (d) => (VEHICLE_LABELS.has(d.label) || d.label === 'person') && d.score >= threshold
      )

      const assigned: Detection[] = filtered.map((d) => {
        const match = prevRef.current.find((p) => iou(p.bbox, d.bbox) > 0.5)
        const prefix = VEHICLE_LABELS.has(d.label) ? 'VEH' : 'PED'
        const id = match ? match.id : `${prefix}-${randomId()}`
        return { id, label: d.label, score: d.score, bbox: d.bbox }
      })

      prevRef.current = assigned
      setPanopticDetections(assigned)
      addConsoleEvent(`PANOPTIC ACTIVE — ${assigned.length} OBJECTS DETECTED`)
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
      if (busyRef.current) return
      busyRef.current = true

      const canvas = viewer.scene.canvas
      const base64 = canvas.toDataURL('image/jpeg', 0.5)
      worker.postMessage({ base64, width: canvas.width, height: canvas.height })
    }, 2000)

    return () => {
      worker.terminate()
      workerRef.current = null
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
      setPanopticDetections([])
      prevRef.current = []
      busyRef.current = false
    }
  }, [viewer, panopticEnabled, panopticDensity, addConsoleEvent, setPanopticDetections])
}
