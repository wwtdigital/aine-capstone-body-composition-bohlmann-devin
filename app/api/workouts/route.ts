import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function ensureTables() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at INTEGER NOT NULL,
      session_type TEXT NOT NULL,
      notes TEXT,
      duration_minutes INTEGER
    )`,
    args: [],
  })
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS workout_muscles (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      muscle_id TEXT NOT NULL,
      volume TEXT NOT NULL
    )`,
    args: [],
  })
}

export async function POST(request: NextRequest) {
  let body: {
    sessionType: string
    musclesWorked: { muscleId: string; volume: 'low' | 'medium' | 'high' }[]
    notes?: string
    durationMinutes?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { sessionType, musclesWorked, notes, durationMinutes } = body

  if (!sessionType) {
    return NextResponse.json({ error: 'sessionType required' }, { status: 400 })
  }

  await ensureTables()

  const id = crypto.randomUUID()
  const loggedAt = Date.now()

  try {
    await db.execute({
      sql: `INSERT INTO workout_sessions (id, user_id, logged_at, session_type, notes, duration_minutes)
            VALUES (?, 'will', ?, ?, ?, ?)`,
      args: [id, loggedAt, sessionType, notes ?? null, durationMinutes ?? null],
    })

    for (const m of (musclesWorked ?? [])) {
      await db.execute({
        sql: `INSERT INTO workout_muscles (id, session_id, muscle_id, volume) VALUES (?, ?, ?, ?)`,
        args: [crypto.randomUUID(), id, m.muscleId, m.volume],
      })
    }
  } catch (err) {
    console.error('DB insert error:', err)
    return NextResponse.json({ error: 'Failed to save workout. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ id })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') ?? '30', 10)
  const since = Date.now() - days * 24 * 60 * 60 * 1000

  await ensureTables()

  try {
    const sessionsResult = await db.execute({
      sql: `SELECT id, logged_at, session_type, duration_minutes, notes
            FROM workout_sessions
            WHERE user_id = 'will' AND logged_at >= ?
            ORDER BY logged_at DESC`,
      args: [since],
    })

    const sessions = await Promise.all(
      sessionsResult.rows.map(async (row) => {
        const musclesResult = await db.execute({
          sql: `SELECT muscle_id, volume FROM workout_muscles WHERE session_id = ?`,
          args: [row.id as string],
        })
        return {
          id: row.id as string,
          logged_at: row.logged_at as number,
          session_type: row.session_type as string,
          duration_minutes: row.duration_minutes as number | null,
          notes: row.notes as string | null,
          muscles: musclesResult.rows.map((m) => ({
            muscle_id: m.muscle_id as string,
            volume: m.volume as string,
          })),
        }
      })
    )

    return NextResponse.json({ sessions })
  } catch (err) {
    console.error('DB query error:', err)
    return NextResponse.json({ error: 'Failed to fetch workouts.' }, { status: 500 })
  }
}
