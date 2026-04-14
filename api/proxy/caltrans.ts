import type { VercelRequest, VercelResponse } from '@vercel/node'

const ALLOWED = new Set(['d3', 'd4', 'd7', 'd11'])
const TIMEOUT_MS = 25_000

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const raw = req.query.district
  const district = typeof raw === 'string' ? raw.toLowerCase() : ''
  if (!ALLOWED.has(district)) {
    res.status(400).json({ error: 'Invalid or missing district' })
    return
  }

  const num = district.replace(/\D/g, '').padStart(2, '0')
  const upstreamUrl = `https://cwwp2.dot.ca.gov/data/${district}/cctv/cctvStatusD${num}.json`

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)

  let upstreamResp: Response
  try {
    upstreamResp = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      signal: ac.signal,
    })
  } catch (err) {
    clearTimeout(t)
    console.error('[api/proxy/caltrans] fetch failed', err)
    res.status(502).json({ error: 'Upstream fetch failed' })
    return
  } finally {
    clearTimeout(t)
  }

  const ct = upstreamResp.headers.get('content-type') ?? 'application/json'
  res.status(upstreamResp.status).setHeader('Content-Type', ct)
  res.send(await upstreamResp.text())
}
