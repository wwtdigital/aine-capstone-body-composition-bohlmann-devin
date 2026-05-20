import { db } from './db'
import { USER_ID } from './userId'

export type Goals = {
  current_weight_lbs: number
  target_weight_lbs: number
  tdee_calories: number
  calorie_deficit_surplus: number
  daily_calories: number        // computed: tdee + deficit_surplus
  daily_protein_g: number
  daily_sleep_hours: number
  // kept for backwards compat (AI context, etc.)
  target_body_fat_pct: number
  target_lean_mass_kg: number
  daily_carbs_g: number
  daily_fat_g: number
}

export const GOAL_DEFAULTS: Goals = {
  current_weight_lbs: 185,
  target_weight_lbs: 180,
  tdee_calories: 2800,
  calorie_deficit_surplus: -300,
  daily_calories: 2500,
  daily_protein_g: 200,
  daily_sleep_hours: 8,
  target_body_fat_pct: 12,
  target_lean_mass_kg: 80,
  daily_carbs_g: 200,
  daily_fat_g: 80,
}

export async function getGoals(): Promise<Goals> {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM goals WHERE user_id = ?',
      args: [USER_ID],
    })
    if (result.rows.length === 0) return GOAL_DEFAULTS
    const row = result.rows[0] as any
    const tdee = row.tdee_calories ?? GOAL_DEFAULTS.tdee_calories
    const delta = row.calorie_deficit_surplus ?? GOAL_DEFAULTS.calorie_deficit_surplus
    return {
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
    }
  } catch {
    return GOAL_DEFAULTS
  }
}
