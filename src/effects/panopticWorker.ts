/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

export type WorkerDetection = {
  label: string
  score: number
  bbox: [number, number, number, number]
}

let model: cocoSsd.ObjectDetection | null = null
let modelLoading = false

async function getModel(): Promise<cocoSsd.ObjectDetection> {
  if (model) return model
  if (modelLoading) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => { if (model) { clearInterval(check); resolve() } }, 100)
    })
    return model!
  }
  modelLoading = true
  await tf.ready()
  model = await cocoSsd.load({ base: 'lite_mobilenet_v2' })
  modelLoading = false
  return model
}

self.onmessage = async (e: MessageEvent<{ base64: string; width: number; height: number }>) => {
  const { base64, width, height } = e.data

  try {
    const m = await getModel()

    // Decode base64 JPEG → Blob → ImageBitmap → OffscreenCanvas
    const byteStr = atob(base64.split(',')[1])
    const bytes = new Uint8Array(byteStr.length)
    for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i)
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    const bitmap = await createImageBitmap(blob)

    const offscreen = new OffscreenCanvas(width, height)
    const ctx = offscreen.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const raw = await m.detect(offscreen as unknown as HTMLCanvasElement)

    const detections: WorkerDetection[] = raw.map((d) => ({
      label: d.class,
      score: d.score,
      bbox: d.bbox as [number, number, number, number],
    }))

    self.postMessage({ detections })
  } catch (err) {
    self.postMessage({ detections: [], error: String(err) })
  }
}
