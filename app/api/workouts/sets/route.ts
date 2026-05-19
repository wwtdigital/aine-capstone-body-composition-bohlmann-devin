import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS workout_sets (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      exercise TEXT NOT NULL,
      set_num INTEGER NOT NULL,
      reps INTEGER,
      weight_lbs REAL,
      logged_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function POST(request: NextRequest) {
  const body: { sessionId: string; sets: { exercise: string; setNum: number; reps: number | null; weightLbs: number | null }[] } = await request.json()
  await ensureTable()
  for (const s of body.sets) {
    await db.execute({
      sql: `INSERT INTO workout_sets (id, session_id, user_id, exercise, set_num, reps, weight_lbs, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), body.sessionId, USER_ID, s.exercise, s.setNum, s.reps ?? null, s.weightLbs ?? null, Date.now()],
    })
  }
  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const sessionId = new URL(request.url).searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ sets: [] })
  await ensureTable()
  const result = await db.execute({
    sql: `SELECT exercise, set_num, reps, weight_lbs FROM workout_sets WHERE session_id = ? AND user_id = ? ORDER BY exercise, set_num`,
    args: [sessionId, USER_ID],
  })
  return NextResponse.json({ sets: result.rows })
}
