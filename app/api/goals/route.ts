import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { GOAL_DEFAULTS } from '@/lib/getGoals'
import { USER_ID } from '@/lib/userId'

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS goals (
      user_id TEXT PRIMARY KEY,
      target_weight_lbs REAL,
      target_body_fat_pct REAL,
      target_lean_mass_kg REAL,
      daily_calories REAL,
      daily_protein_g REAL,
      daily_carbs_g REAL,
      daily_fat_g REAL,
      daily_sleep_hours REAL,
      updated_at INTEGER
    )`,
    args: [],
  })
  for (const ddl of [
    `ALTER TABLE goals ADD COLUMN target_weight_lbs REAL`,
    `ALTER TABLE goals ADD COLUMN current_weight_lbs REAL`,
    `ALTER TABLE goals ADD COLUMN tdee_calories REAL`,
    `ALTER TABLE goals ADD COLUMN calorie_deficit_surplus REAL`,
  ]) {
    try { await db.execute({ sql: ddl, args: [] }) } catch { /* already exists */ }
  }
}

export async function GET() {
  await ensureTable()
  const result = await db.execute({
    sql: 'SELECT * FROM goals WHERE user_id = ?',
    args: [USER_ID],
  })
  if (result.rows.length === 0) return NextResponse.json(GOAL_DEFAULTS)
  const row = result.rows[0] as any
  const tdee = row.tdee_calories ?? GOAL_DEFAULTS.tdee_calories
  const delta = row.calorie_deficit_surplus ?? GOAL_DEFAULTS.calorie_deficit_surplus
  return NextResponse.json({
    current_weight_lbs: row.current_weight_lbs ?? GOAL_DEFAULTS.current_weight_lbs,
    target_weight_lbs: row.target_weight_lbs ?? GOAL_DEFAULTS.target_weight_lbs,
    tdee_calories: tdee,
    calorie_deficit_surplus: delta,
    daily_calories: row.daily_calories ?? (tdee + delta),
    daily_protein_g: row.daily_protein_g ?? GOAL_DEFAULTS.daily_protein_g,
    daily_sleep_hours: row.daily_sleep_hours ?? GOAL_DEFAULTS.daily_sleep_hours,
    target_body_fat_pct: row.target_body_fat_pct ?? GOAL_DEFAULTS.target_body_fat_pct,
    target_lean_mass_kg: row.target_lean_mass_kg ?? GOAL_DEFAULTS.target_lean_mass_kg,
    daily_carbs_g: row.daily_carbs_g ?? GOAL_DEFAULTS.daily_carbs_g,
    daily_fat_g: row.daily_fat_g ?? GOAL_DEFAULTS.daily_fat_g,
  })
}

export async function PUT(req: Request) {
  await ensureTable()
  const body = await req.json()
  const tdee = body.tdee_calories ?? GOAL_DEFAULTS.tdee_calories
  const delta = body.calorie_deficit_surplus ?? GOAL_DEFAULTS.calorie_deficit_surplus
  const computedCals = tdee + delta
  await db.execute({
    sql: `INSERT OR REPLACE INTO goals
      (user_id, current_weight_lbs, target_weight_lbs, target_body_fat_pct, target_lean_mass_kg,
       tdee_calories, calorie_deficit_surplus, daily_calories,
       daily_protein_g, daily_carbs_g, daily_fat_g, daily_sleep_hours, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      USER_ID,
      body.current_weight_lbs ?? GOAL_DEFAULTS.current_weight_lbs,
      body.target_weight_lbs ?? GOAL_DEFAULTS.target_weight_lbs,
      body.target_body_fat_pct ?? GOAL_DEFAULTS.target_body_fat_pct,
      body.target_lean_mass_kg ?? GOAL_DEFAULTS.target_lean_mass_kg,
      tdee,
      delta,
      computedCals,
      body.daily_protein_g ?? GOAL_DEFAULTS.daily_protein_g,
      body.daily_carbs_g ?? GOAL_DEFAULTS.daily_carbs_g,
      body.daily_fat_g ?? GOAL_DEFAULTS.daily_fat_g,
      body.daily_sleep_hours ?? GOAL_DEFAULTS.daily_sleep_hours,
      Date.now(),
    ],
  })
  return NextResponse.json({ ok: true })
}
