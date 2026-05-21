import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const k = process.env.ENCRYPTION_KEY
  // Must be exactly 64 hex chars (32 bytes)
  if (!k || k.length !== 64) return null
  return Buffer.from(k, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  if (!key) return plaintext

  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) return value // plaintext passthrough for legacy data

  const key = getKey()
  if (!key) return '' // key was removed — return empty rather than crash

  const buf = Buffer.from(value.slice(PREFIX.length), 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)

  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}
