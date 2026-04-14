import type { VercelRequest, VercelResponse } from '@vercel/node'

const UPSTREAM = 'https://webcams.nyctmc.org/api/cameras'
const TIMEOUT_MS = 25_000

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `https://${host}`)
  const upstreamUrl = `${UPSTREAM}${url.search}`

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
    console.error('[api/proxy/nyctmc/api/cameras] fetch failed', err)
    res.status(502).json({ error: 'Upstream fetch failed' })
    return
  } finally {
    clearTimeout(t)
  }

  const ct = upstreamResp.headers.get('content-type') ?? 'application/json'
  res.status(upstreamResp.status).setHeader('Content-Type', ct)
  res.send(await upstreamResp.text())
}
