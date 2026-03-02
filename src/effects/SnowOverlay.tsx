import { useEffect, useRef } from 'react'

interface Snowflake {
  x: number
  y: number
  r: number
  speed: number
  opacity: number
  drift: number
}

function makeFlakes(w: number, h: number): Snowflake[] {
  return Array.from({ length: 150 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 2.5 + 0.5,
    speed: Math.random() * 1.2 + 0.4,
    opacity: Math.random() * 0.6 + 0.2,
    drift: (Math.random() - 0.5) * 0.4,
  }))
}

export default function SnowOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width  = w
    canvas.height = h

    const flakes = makeFlakes(w, h)

    function onResize() {
      w = window.innerWidth
      h = window.innerHeight
      canvas!.width  = w
      canvas!.height = h
    }
    window.addEventListener('resize', onResize)

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      for (const f of flakes) {
        ctx!.beginPath()
        ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(220, 240, 255, ${f.opacity})`
        ctx!.fill()

        f.y += f.speed
        f.x += f.drift
        if (f.y > h + f.r) { f.y = -f.r; f.x = Math.random() * w }
        if (f.x > w + f.r) { f.x = -f.r }
        if (f.x < -f.r)    { f.x = w + f.r }
      }
      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9997,
      }}
    />
  )
}
