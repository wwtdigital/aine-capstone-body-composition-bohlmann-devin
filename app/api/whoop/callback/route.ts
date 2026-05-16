import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings?whoop=error', request.url))
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
  })

  let tokenData: { access_token: string; refresh_token: string; expires_in: number }
  try {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!res.ok) {
      console.error('Whoop token exchange failed:', res.status, await res.text())
      return NextResponse.redirect(new URL('/settings?whoop=error', request.url))
    }
    tokenData = await res.json()
  } catch (err) {
    console.error('Whoop token exchange error:', err)
    return NextResponse.redirect(new URL('/settings?whoop=error', request.url))
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000

  await db.execute({
    sql: `INSERT INTO whoop_auth (user_id, access_token, refresh_token, expires_at, updated_at)
          VALUES ('will', ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at`,
    args: [tokenData.access_token, tokenData.refresh_token, expiresAt, Date.now()],
  })

  return NextResponse.redirect(new URL('/settings?whoop=connected', request.url))
}
