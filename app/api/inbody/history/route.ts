import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function GET() {
  const result = await db.execute({
    sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = ? ORDER BY reading_date ASC`,
    args: [USER_ID],
  })

  const readings = (result.rows as unknown as {
    reading_date: number
    weight_kg: number | null
    body_fat_pct: number | null
    lean_mass_kg: number | null
  }[]).map(r => ({
    date: new Date(r.reading_date).toISOString().split('T')[0],
    weight_kg: r.weight_kg ?? 0,
    body_fat_pct: r.body_fat_pct,
    lean_mass_kg: r.lean_mass_kg,
  }))

  return NextResponse.json({ readings })
}
