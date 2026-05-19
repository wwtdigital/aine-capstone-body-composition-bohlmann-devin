// Derives a deterministic session token from APP_PASSWORD using HMAC-SHA256.
// The cookie stores this token, never the raw password.
export const SESSION_COOKIE = 'frame_session'
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function getSessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? 'no-password-set'
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('frame-session-v1'))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}
