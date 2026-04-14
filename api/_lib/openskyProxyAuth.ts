/**
 * OpenSky OAuth for Vercel serverless only (no VITE_ prefix — secrets stay off the client).
 */

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

interface TokenCache {
  token: string
  expiresAt: number
}

let cache: TokenCache | null = null

interface TokenResponse {
  access_token: string
  expires_in: number
}

export async function getOpenSkyProxyAuthHeaders(): Promise<HeadersInit> {
  const id = process.env.OPENSKY_CLIENT_ID
  const secret = process.env.OPENSKY_CLIENT_SECRET
  if (!id || !secret) return {}

  if (cache && Date.now() < cache.expiresAt) {
    return { Authorization: `Bearer ${cache.token}` }
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: id,
      client_secret: secret,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenSky auth ${res.status}: ${text.slice(0, 200)}`)
  }
  const data = (await res.json()) as TokenResponse
  cache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }
  return { Authorization: `Bearer ${cache.token}` }
}
