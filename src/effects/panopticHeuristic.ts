export interface HeuristicDetection {
  bbox: [number, number, number, number]
  score: number
}

const RECT_W = 14
const RECT_H = 28
const BORDER = 3
const GRID_STEP = 22
const CONTRAST_THRESHOLD = 10
const MAX_BRACKETS_MIN = 8
const MAX_BRACKETS_RANGE = 42

function luminance(data: Uint8ClampedArray, i: number): number {
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
}

function iou(a: [number, number, number, number], b: [number, number, number, number]): number {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3]
  const bx2 = b[0] + b[2], by2 = b[1] + b[3]
  const ix = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]))
  const iy = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]))
  const inter = ix * iy
  if (inter === 0) return 0
  return inter / (a[2] * a[3] + b[2] * b[3] - inter)
}

function sampleRect(
  lum: Float32Array,
  w: number,
  h: number,
  cx: number,
  cy: number,
  rw: number,
  rh: number
): number {
  let sum = 0
  let n = 0
  const x0 = Math.max(0, cx - rw)
  const y0 = Math.max(0, cy - rh)
  const x1 = Math.min(w, cx + rw)
  const y1 = Math.min(h, cy + rh)
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      sum += lum[y * w + x]
      n++
    }
  }
  return n > 0 ? sum / n : 0
}

export function detectVehicleLikeRegions(
  canvas: HTMLCanvasElement,
  density: number
): HeuristicDetection[] {
  const w = canvas.width
  const h = canvas.height
  if (w < RECT_W + BORDER * 2 || h < RECT_H + BORDER * 2) return []

  const off = new OffscreenCanvas(w, h)
  const ctx = off.getContext('2d')
  if (!ctx) return []
  ctx.drawImage(canvas, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const lum = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) lum[i] = luminance(data, i * 4)

  const candidates: HeuristicDetection[] = []
  const halfW = Math.floor(RECT_W / 2)
  const halfH = Math.floor(RECT_H / 2)
  const outerW = halfW + BORDER
  const outerH = halfH + BORDER

  const innerArea = RECT_W * RECT_H
  const outerPixels = (outerW * 2) * (outerH * 2)
  const ringArea = outerPixels - innerArea

  for (let cy = halfH + BORDER; cy < h - halfH - BORDER; cy += GRID_STEP) {
    for (let cx = halfW + BORDER; cx < w - halfW - BORDER; cx += GRID_STEP) {
      const innerMean = sampleRect(lum, w, h, cx, cy, halfW, halfH)
      const fullOuterMean = sampleRect(lum, w, h, cx, cy, outerW, outerH)
      const ringSum = fullOuterMean * outerPixels - innerMean * innerArea
      const ringMean = ringArea > 0 ? ringSum / ringArea : 0
      const score = innerMean - ringMean
      if (score >= CONTRAST_THRESHOLD) {
        const x = cx - halfW
        const y = cy - halfH
        candidates.push({ bbox: [x, y, RECT_W, RECT_H], score })
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  const kept: HeuristicDetection[] = []
  for (const c of candidates) {
    if (kept.some((k) => iou(k.bbox, c.bbox) > 0.5)) continue
    kept.push(c)
  }

  const maxBrackets = MAX_BRACKETS_MIN + Math.floor((density / 100) * MAX_BRACKETS_RANGE)
  return kept.slice(0, maxBrackets)
}
