import { NextRequest, NextResponse } from 'next/server'
import { getSessionToken, SESSION_COOKIE } from '@/lib/session'

const PUBLIC_EXACT = new Set(['/login', '/api/auth/login', '/api/auth/check', '/api/whoop/callback'])
const PUBLIC_PREFIX = ['/_next', '/favicon', '/icon', '/icons', '/apple-touch-icon', '/sw.js']
const PUBLIC_FILES = new Set(['/manifest.json', '/robots.txt'])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    PUBLIC_EXACT.has(pathname) ||
    PUBLIC_FILES.has(pathname) ||
    PUBLIC_PREFIX.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next()
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value
  const expected = await getSessionToken()

  if (!session || session !== expected) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
