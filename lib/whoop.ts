import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const API_BASE = 'https://api.prod.whoop.com/developer'

type TokenRow = {
  access_token: string
  refresh_token: string
  expires_at: number
}

async function refreshTokens(refreshToken: string): Promise<TokenRow> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whoop token refresh failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  const expiresAt = Date.now() + data.expires_in * 1000

  await db.execute({
    sql: `UPDATE whoop_auth SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ? WHERE user_id = ?`,
    args: [data.access_token, data.refresh_token ?? refreshToken, expiresAt, Date.now(), USER_ID],
  })

  return { access_token: data.access_token, refresh_token: data.refresh_token ?? refreshToken, expires_at: expiresAt }
}

export async function getWhoopToken(): Promise<string | null> {
  const result = await db.execute({
    sql: `SELECT access_token, refresh_token, expires_at FROM whoop_auth WHERE user_id = ?`,
    args: [USER_ID],
  })

  if (!result.rows.length) return null
  const row = result.rows[0] as unknown as TokenRow

  if (Date.now() >= row.expires_at - 60_000) {
    const refreshed = await refreshTokens(row.refresh_token)
    return refreshed.access_token
  }

  return row.access_token
}

export async function whoopFetch(path: string): Promise<unknown> {
  const token = await getWhoopToken()
  if (!token) throw new Error('Whoop not connected')

  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Whoop API error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function isWhoopConnected(): Promise<boolean> {
  const result = await db.execute({
    sql: `SELECT access_token FROM whoop_auth WHERE user_id = ?`,
    args: [USER_ID],
  })
  return result.rows.length > 0 && !!(result.rows[0] as unknown as { access_token: string }).access_token
}
