import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function ensureTables() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS training_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      goal TEXT,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      target_strength_days INTEGER NOT NULL DEFAULT 4,
      target_soccer_days INTEGER NOT NULL DEFAULT 2,
      created_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function GET() {
  await ensureTables()

  const today = new Date().toISOString().split('T')[0]

  const blockResult = await db.execute({
    sql: `SELECT id, name, goal, start_date, end_date, target_strength_days, target_soccer_days
          FROM training_blocks
          WHERE user_id = 'will' AND start_date <= ? AND end_date >= ?
          ORDER BY created_at DESC
          LIMIT 1`,
    args: [today, today],
  })

  const block = blockResult.rows[0]
    ? {
        id: blockResult.rows[0].id as string,
        name: blockResult.rows[0].name as string,
        goal: blockResult.rows[0].goal as string | null,
        start_date: blockResult.rows[0].start_date as string,
        end_date: blockResult.rows[0].end_date as string,
        target_strength_days: blockResult.rows[0].target_strength_days as number,
        target_soccer_days: blockResult.rows[0].target_soccer_days as number,
      }
    : null

  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000

  const sessionsResult = await db.execute({
    sql: `SELECT id, logged_at, session_type
          FROM workout_sessions
          WHERE user_id = 'will' AND logged_at >= ?
          ORDER BY logged_at ASC`,
    args: [ninetyDaysAgo],
  })

  const sessions = sessionsResult.rows.map((r) => ({
    id: r.id as string,
    logged_at: r.logged_at as number,
    session_type: r.session_type as string,
  }))

  return NextResponse.json({ block, sessions })
}

export async function POST(request: NextRequest) {
  let body: {
    name: string
    goal?: string
    startDate: string
    endDate: string
    targetStrengthDays: number
    targetSoccerDays: number
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, goal, startDate, endDate, targetStrengthDays, targetSoccerDays } = body

  if (!name || !startDate || !endDate) {
    return NextResponse.json({ error: 'name, startDate, and endDate are required' }, { status: 400 })
  }

  await ensureTables()

  const id = crypto.randomUUID()
  const createdAt = Date.now()

  await db.execute({
    sql: `INSERT INTO training_blocks (id, user_id, name, goal, start_date, end_date, target_strength_days, target_soccer_days, created_at)
          VALUES (?, 'will', ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, name, goal ?? null, startDate, endDate, targetStrengthDays ?? 4, targetSoccerDays ?? 2, createdAt],
  })

  return NextResponse.json({ id })
}
