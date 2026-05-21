import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'
import { encrypt, decrypt } from '@/lib/encrypt'

async function ensureColumn() {
  try {
    await db.execute({ sql: `ALTER TABLE user_settings ADD COLUMN context_notes TEXT`, args: [] })
  } catch { /* already exists */ }
}

export async function GET() {
  await ensureColumn()
  const result = await db.execute({
    sql: `SELECT context_notes FROM user_settings WHERE user_id = ?`,
    args: [USER_ID],
  })
  const raw = (result.rows[0] as any)?.context_notes ?? ''
  return NextResponse.json({ context_notes: decrypt(raw) })
}

export async function PUT(request: NextRequest) {
  const { context_notes } = await request.json()
  await ensureColumn()
  await db.execute({
    sql: `INSERT INTO user_settings (user_id, onboarding_completed, context_notes)
          VALUES (?, 1, ?)
          ON CONFLICT(user_id) DO UPDATE SET context_notes = excluded.context_notes`,
    args: [USER_ID, encrypt(context_notes ?? '')],
  })
  return NextResponse.json({ ok: true })
}
