import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/login',
  '/api/whoop/callback',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/apple-touch-icon',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = request.cookies.get('bcc_session')
  if (session?.value !== process.env.APP_PASSWORD) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
