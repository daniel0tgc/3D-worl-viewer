import { useEffect, useRef } from 'react'
import { useWorldStore } from '../store/useWorldStore'
import type { Detection } from '../effects/panoptic'

const TEAL       = '#00FFFF'
const LABEL_FONT = "11px 'Courier New', monospace"
const ARM        = 10

function drawBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number
): void {
  ctx.strokeStyle = TEAL
  ctx.lineWidth = 1.8
  ctx.setLineDash([])

  const corners: Array<[number, number, number, number, number, number]> = [
    // [startX, startY, midX, midY, endX, endY] for each corner L-shape
    [x,     y + ARM, x,     y,     x + ARM, y    ],
    [x+w-ARM, y,     x+w,   y,     x+w,   y + ARM],
    [x,     y+h-ARM, x,     y+h,   x + ARM, y+h  ],
    [x+w-ARM, y+h,   x+w,   y+h,   x+w,   y+h-ARM],
  ]

  for (const [x1, y1, mx, my, x2, y2] of corners) {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(mx, my)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number
): void {
  ctx.font = LABEL_FONT
  ctx.fillStyle = TEAL
  const metrics = ctx.measureText(text)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(x, y - 14, metrics.width + 4, 14)
  ctx.fillStyle = TEAL
  ctx.fillText(text, x + 2, y - 3)
}

function redraw(
  canvas: HTMLCanvasElement,
  detections: Detection[],
  scaleX: number,
  scaleY: number
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (const d of detections) {
    const [bx, by, bw, bh] = d.bbox
    const x = bx * scaleX
    const y = by * scaleY
    const w = bw * scaleX
    const h = bh * scaleY
    drawBrackets(ctx, x, y, w, h)
    drawLabel(ctx, d.id, x, y)
  }
}

export default function PanopticOverlay() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const detections = useWorldStore((s) => s.panopticDetections)
  const viewer     = useWorldStore((s) => s.viewer)

  // Keep canvas sized to window and recompute scale on resize
  const scaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function syncSize() {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas!.width  = w
      canvas!.height = h

      // Detections are in Cesium canvas pixel space; scale to overlay canvas
      const cesiumCanvas = viewer?.scene.canvas
      scaleRef.current = cesiumCanvas
        ? { x: w / cesiumCanvas.width, y: h / cesiumCanvas.height }
        : { x: 1, y: 1 }
    }

    syncSize()
    window.addEventListener('resize', syncSize)
    return () => window.removeEventListener('resize', syncSize)
  }, [viewer])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    redraw(canvas, detections, scaleRef.current.x, scaleRef.current.y)
  }, [detections])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9996,
      }}
    />
  )
}
