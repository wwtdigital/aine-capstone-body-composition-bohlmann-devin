import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PREFIXES = ['/login', '/api/auth/login']
const STATIC_PREFIXES = ['/_next', '/favicon.ico', '/manifest.json', '/icons', '/sw.js']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = request.cookies.get('bcc_session')?.value
  if (!session || session !== process.env.APP_PASSWORD) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|sw\\.js).*)'],
}
