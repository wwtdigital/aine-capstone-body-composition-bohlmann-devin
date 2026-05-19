import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const returnedState = searchParams.get('state')

  if (error || !code) {
    const url = new URL('/settings', request.url)
    url.searchParams.set('whoop', 'error')
    url.searchParams.set('detail', error ?? 'no_code')
    return NextResponse.redirect(url)
  }

  // Verify state to prevent CSRF
  const cookieStore = await cookies()
  const expectedState = cookieStore.get('whoop_oauth_state')?.value
  cookieStore.delete('whoop_oauth_state')

  if (!expectedState || returnedState !== expectedState) {
    const url = new URL('/settings', request.url)
    url.searchParams.set('whoop', 'error')
    url.searchParams.set('detail', 'state_mismatch')
    return NextResponse.redirect(url)
  }

  const redirectUri = process.env.WHOOP_REDIRECT_URI ?? ''
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.WHOOP_CLIENT_ID ?? '',
    client_secret: process.env.WHOOP_CLIENT_SECRET ?? '',
    redirect_uri: redirectUri,
  })

  let tokenData: { access_token: string; refresh_token: string; expires_in: number }
  try {
    const res = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('Whoop token exchange failed:', res.status, body)
      const url = new URL('/settings', request.url)
      url.searchParams.set('whoop', 'error')
      url.searchParams.set('detail', `${res.status}: ${body.slice(0, 200)}`)
      return NextResponse.redirect(url)
    }
    tokenData = await res.json()
  } catch (err) {
    console.error('Whoop token exchange error:', err)
    const url = new URL('/settings', request.url)
    url.searchParams.set('whoop', 'error')
    url.searchParams.set('detail', err instanceof Error ? err.message : 'network_error')
    return NextResponse.redirect(url)
  }

  const expiresAt = Date.now() + tokenData.expires_in * 1000

  await db.execute({
    sql: `INSERT INTO whoop_auth (user_id, access_token, refresh_token, expires_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            updated_at = excluded.updated_at`,
    args: [USER_ID, tokenData.access_token, tokenData.refresh_token, expiresAt, Date.now()],
  })

  return NextResponse.redirect(new URL('/settings?whoop=connected', request.url))
}
