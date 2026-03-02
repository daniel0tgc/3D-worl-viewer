// OAuth2 client-credentials flow for OpenSky Network.
// If credentials are absent (dev/CI), falls back to anonymous (unauthenticated) requests.

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

const CLIENT_ID = import.meta.env.VITE_OPENSKY_CLIENT_ID as string | undefined
const CLIENT_SECRET = import.meta.env.VITE_OPENSKY_CLIENT_SECRET as string | undefined

interface TokenCache {
  token: string
  expiresAt: number
}

let _cache: TokenCache | null = null

interface TokenResponse {
  access_token: string
  expires_in: number
}

async function refreshToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error(`OpenSky auth ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as TokenResponse
  // Subtract 60 s so we refresh before the token actually expires
  _cache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return _cache.token
}

/**
 * Returns `{ Authorization: 'Bearer <token>' }` when client credentials are
 * configured, or an empty object for anonymous access.
 */
export async function getAuthHeader(): Promise<HeadersInit> {
  if (!CLIENT_ID || !CLIENT_SECRET) return {}
  if (_cache && Date.now() < _cache.expiresAt) {
    return { Authorization: `Bearer ${_cache.token}` }
  }
  const token = await refreshToken()
  return { Authorization: `Bearer ${token}` }
}
