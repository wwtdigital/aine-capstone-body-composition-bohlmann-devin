import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

function dateToTimestamp(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00Z').getTime()
}

export async function POST(request: NextRequest) {
  let body: {
    reading_date: string
    weight_kg?: number | null
    body_fat_pct?: number | null
    lean_mass_kg?: number | null
    body_water_kg?: number | null
    visceral_fat_level?: number | null
    source?: string
    raw_extracted_json?: string
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!body.reading_date) {
    return NextResponse.json({ error: 'reading_date required' }, { status: 400 })
  }

  const readingDate = dateToTimestamp(body.reading_date)

  const existing = await db.execute({
    sql: `SELECT id FROM inbody_readings WHERE user_id = 'will' AND reading_date = ?`,
    args: [readingDate],
  })

  if (existing.rows.length > 0) {
    return NextResponse.json(
      { error: 'duplicate', message: `Reading for ${body.reading_date} already exists` },
      { status: 409 },
    )
  }

  const id = uuidv4()
  await db.execute({
    sql: `INSERT INTO inbody_readings (id, reading_date, weight_kg, body_fat_pct, lean_mass_kg, body_water_kg, visceral_fat_level, source, raw_extracted_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      readingDate,
      body.weight_kg ?? null,
      body.body_fat_pct ?? null,
      body.lean_mass_kg ?? null,
      body.body_water_kg ?? null,
      body.visceral_fat_level ?? null,
      body.source ?? 'manual',
      body.raw_extracted_json ?? null,
    ],
  })

  return NextResponse.json({ id, ok: true })
}

export async function GET() {
  const result = await db.execute({
    sql: `SELECT * FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC`,
    args: [],
  })
  return NextResponse.json(result.rows)
}
