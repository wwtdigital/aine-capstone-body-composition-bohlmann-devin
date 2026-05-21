import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS meal_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      total_calories REAL NOT NULL,
      total_protein REAL NOT NULL,
      total_carbs REAL NOT NULL,
      total_fat REAL NOT NULL,
      items_json TEXT,
      use_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function GET() {
  await ensureTable()
  const result = await db.execute({
    sql: `SELECT * FROM meal_templates WHERE user_id = ? ORDER BY use_count DESC, created_at DESC LIMIT 20`,
    args: [USER_ID],
  })
  return NextResponse.json({ templates: result.rows })
}

export async function POST(request: NextRequest) {
  let body: {
    name: string
    total_calories: number
    total_protein: number
    total_carbs: number
    total_fat: number
    items_json?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { name, total_calories, total_protein, total_carbs, total_fat, items_json } = body
  if (!name || total_calories == null) {
    return NextResponse.json({ error: 'name and total_calories required' }, { status: 400 })
  }

  await ensureTable()
  await db.execute({
    sql: `INSERT INTO meal_templates (id, user_id, name, total_calories, total_protein, total_carbs, total_fat, items_json, use_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    args: [
      crypto.randomUUID(),
      USER_ID,
      name,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
      items_json ?? null,
      Date.now(),
    ],
  })

  return NextResponse.json({ ok: true })
}
