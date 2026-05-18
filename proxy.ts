import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = [
  '/login',
  '/onboarding',
  '/api/auth/login',
  '/api/auth/check',
  '/api/whoop/callback',
  '/favicon.ico',
  '/manifest.json',
  '/icons',
  '/apple-touch-icon',
  '/sw.js',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = request.cookies.get('bcc_session')
  if (session?.value !== process.env.APP_PASSWORD) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
