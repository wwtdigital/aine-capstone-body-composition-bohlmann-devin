import { db } from './db'
import { USER_ID } from './userId'

export type Goals = {
  target_weight_lbs: number
  target_body_fat_pct: number
  target_lean_mass_kg: number
  daily_calories: number
  daily_protein_g: number
  daily_carbs_g: number
  daily_fat_g: number
  daily_sleep_hours: number
}

export const GOAL_DEFAULTS: Goals = {
  target_weight_lbs: 180,
  target_body_fat_pct: 12,
  target_lean_mass_kg: 80,
  daily_calories: 2500,
  daily_protein_g: 200,
  daily_carbs_g: 200,
  daily_fat_g: 80,
  daily_sleep_hours: 8,
}

export async function getGoals(): Promise<Goals> {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM goals WHERE user_id = ?',
      args: [USER_ID],
    })
    if (result.rows.length === 0) return GOAL_DEFAULTS
    const row = result.rows[0] as any
    return {
      target_weight_lbs: row.target_weight_lbs ?? GOAL_DEFAULTS.target_weight_lbs,
      target_body_fat_pct: row.target_body_fat_pct ?? GOAL_DEFAULTS.target_body_fat_pct,
      target_lean_mass_kg: row.target_lean_mass_kg ?? GOAL_DEFAULTS.target_lean_mass_kg,
      daily_calories: row.daily_calories ?? GOAL_DEFAULTS.daily_calories,
      daily_protein_g: row.daily_protein_g ?? GOAL_DEFAULTS.daily_protein_g,
      daily_carbs_g: row.daily_carbs_g ?? GOAL_DEFAULTS.daily_carbs_g,
      daily_fat_g: row.daily_fat_g ?? GOAL_DEFAULTS.daily_fat_g,
      daily_sleep_hours: row.daily_sleep_hours ?? GOAL_DEFAULTS.daily_sleep_hours,
    }
  } catch {
    return GOAL_DEFAULTS
  }
}
