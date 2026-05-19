import { NextRequest, NextResponse } from 'next/server'
import { getSessionToken, SESSION_COOKIE } from '@/lib/session'

export async function GET(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value
  if (!session) return NextResponse.json({ ok: false }, { status: 401 })

  const expected = await getSessionToken()
  if (session !== expected) return NextResponse.json({ ok: false }, { status: 401 })

  return NextResponse.json({ ok: true })
}
