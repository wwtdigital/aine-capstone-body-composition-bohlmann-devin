import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { put } from '@vercel/blob'
import { v4 as uuidv4 } from 'uuid'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS progress_photos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      pose TEXT NOT NULL,
      photo_url TEXT NOT NULL,
      weight_kg REAL,
      taken_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function POST(request: NextRequest) {
  let body: {
    imageBase64: string
    mediaType?: string
    pose: 'front' | 'side' | 'back'
    weightKg?: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.imageBase64 || !body.pose) {
    return NextResponse.json({ error: 'imageBase64 and pose are required' }, { status: 400 })
  }

  await ensureTable()

  const id = uuidv4()
  const buffer = Buffer.from(body.imageBase64, 'base64')
  const blob = await put(`progress_photos/${id}.jpg`, buffer, {
    access: 'public',
    contentType: body.mediaType ?? 'image/jpeg',
  })

  const takenAt = Date.now()

  await db.execute({
    sql: `INSERT INTO progress_photos (id, user_id, pose, photo_url, weight_kg, taken_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, USER_ID, body.pose, blob.url, body.weightKg ?? null, takenAt],
  })

  return NextResponse.json({ id, photo_url: blob.url, taken_at: takenAt })
}

export async function GET() {
  await ensureTable()

  const result = await db.execute({
    sql: `SELECT id, pose, photo_url, weight_kg, taken_at FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC`,
    args: [USER_ID],
  })

  const photos = (result.rows as unknown as {
    id: string
    pose: string
    photo_url: string
    weight_kg: number | null
    taken_at: number
  }[])

  return NextResponse.json({ photos })
}
