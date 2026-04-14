import type { VercelRequest, VercelResponse } from '@vercel/node'

const ORIGIN = 'https://webcams.nyctmc.org'
const ALLOWED_PATH = 'api/cameras'
const TIMEOUT_MS = 25_000

function pathFromQuery(pathParam: string | string[] | undefined): string {
  if (pathParam == null) return ''
  return Array.isArray(pathParam) ? pathParam.join('/') : pathParam
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const rel = pathFromQuery(req.query.path as string | string[] | undefined)
  if (rel !== ALLOWED_PATH) {
    res.status(404).end('Not Found')
    return
  }

  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `https://${host}`)
  const upstreamUrl = `${ORIGIN}/${rel}${url.search}`

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { Accept: 'application/json' },
      signal: ac.signal,
    })
  } catch (err) {
    clearTimeout(t)
    console.error('[api/proxy/nyctmc] fetch failed', err)
    res.status(502).json({ error: 'Upstream fetch failed' })
    return
  } finally {
    clearTimeout(t)
  }

  const ct = upstream.headers.get('content-type') ?? 'application/json'
  res.status(upstream.status).setHeader('Content-Type', ct)

  const body = await upstream.text()
  res.send(body)
}
