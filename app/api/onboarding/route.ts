import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      profile_json TEXT
    )
  `)
}

export async function GET() {
  await ensureTable()
  const result = await db.execute({
    sql: 'SELECT onboarding_completed FROM user_settings WHERE user_id = ?',
    args: [USER_ID],
  })
  if (result.rows.length > 0 && result.rows[0].onboarding_completed === 1) {
    return NextResponse.json({ completed: true })
  }
  return NextResponse.json({ completed: false })
}

export async function POST(req: Request) {
  await ensureTable()
  const body = await req.json()
  const profile = {
    name: body.name,
    weightKg: body.weightKg,
    heightCm: body.heightCm,
    trainingProfile: body.trainingProfile,
  }
  await db.execute({
    sql: `INSERT OR REPLACE INTO user_settings (user_id, onboarding_completed, profile_json)
          VALUES (?, 1, ?)`,
    args: [USER_ID, JSON.stringify(profile)],
  })
  return NextResponse.json({ ok: true })
}
