import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const DEFAULTS = {
  daily_calories: 2500,
  daily_protein_g: 200,
  daily_carbs_g: 200,
  daily_fat_g: 80,
  target_body_fat_pct: 12,
  target_lean_mass_kg: 80,
  daily_sleep_hours: 8,
}

export async function GET() {
  const result = await db.execute({
    sql: 'SELECT * FROM goals WHERE user_id = ?',
    args: ['will'],
  })
  if (result.rows.length === 0) {
    return NextResponse.json(DEFAULTS)
  }
  const row = result.rows[0]
  return NextResponse.json({
    daily_calories: row.daily_calories,
    daily_protein_g: row.daily_protein_g,
    daily_carbs_g: row.daily_carbs_g,
    daily_fat_g: row.daily_fat_g,
    target_body_fat_pct: row.target_body_fat_pct,
    target_lean_mass_kg: row.target_lean_mass_kg,
    daily_sleep_hours: row.daily_sleep_hours,
  })
}

export async function PUT(req: Request) {
  const body = await req.json()
  await db.execute({
    sql: `INSERT OR REPLACE INTO goals
      (user_id, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, target_body_fat_pct, target_lean_mass_kg, daily_sleep_hours, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      'will',
      body.daily_calories,
      body.daily_protein_g,
      body.daily_carbs_g,
      body.daily_fat_g,
      body.target_body_fat_pct,
      body.target_lean_mass_kg,
      body.daily_sleep_hours,
      Date.now(),
    ],
  })
  return NextResponse.json({ ok: true })
}
