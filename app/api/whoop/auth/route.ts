import { NextResponse } from 'next/server'

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.WHOOP_CLIENT_ID!,
    redirect_uri: process.env.WHOOP_REDIRECT_URI!,
    scope: 'offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement',
  })

  const url = `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
  return NextResponse.redirect(url)
}
