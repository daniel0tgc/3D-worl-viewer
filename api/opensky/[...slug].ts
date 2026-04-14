import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getOpenSkyProxyAuthHeaders } from '../../server/openskyProxyAuth'

const UPSTREAM = 'https://opensky-network.org/api'
const ALLOWED_SLUG = 'states/all'
const TIMEOUT_MS = 25_000

function slugToPath(slug: string | string[] | undefined): string {
  if (slug == null) return ''
  return Array.isArray(slug) ? slug.join('/') : slug
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed')
    return
  }

  const path = slugToPath(req.query.slug as string | string[] | undefined)
  if (path !== ALLOWED_SLUG) {
    res.status(404).end('Not Found')
    return
  }

  const host = req.headers.host ?? 'localhost'
  const url = new URL(req.url ?? '/', `https://${host}`)
  const upstreamUrl = `${UPSTREAM}/${path}${url.search}`

  let auth: HeadersInit
  try {
    auth = await getOpenSkyProxyAuthHeaders()
  } catch (err) {
    console.error('[api/opensky] auth failed', err)
    res.status(502).json({ error: 'OpenSky auth failed' })
    return
  }

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS)

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      headers: { ...auth, Accept: 'application/json' },
      signal: ac.signal,
    })
  } catch (err) {
    clearTimeout(t)
    console.error('[api/opensky] fetch failed', err)
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
