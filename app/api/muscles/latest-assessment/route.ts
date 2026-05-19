import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS muscle_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assessed_at INTEGER NOT NULL,
      scores_json TEXT NOT NULL,
      notes TEXT
    )`,
    args: [],
  })
}

export async function GET() {
  await ensureTable()

  const result = await db.execute({
    sql: `SELECT scores_json, notes, assessed_at
          FROM muscle_assessments
          WHERE user_id = ?
          ORDER BY assessed_at DESC
          LIMIT 1`,
    args: [USER_ID],
  })

  if (result.rows.length === 0) {
    return NextResponse.json(null)
  }

  const row = result.rows[0]
  return NextResponse.json({
    scores: JSON.parse(row.scores_json as string),
    notes: row.notes as string | null,
    assessedAt: row.assessed_at as number,
  })
}
