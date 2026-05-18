import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set('whoop_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    scope: 'offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement',
    state,
  })

  const url = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
  return NextResponse.redirect(url)
}
