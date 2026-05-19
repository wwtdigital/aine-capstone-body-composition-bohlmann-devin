import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'
import { getGoals } from '@/lib/getGoals'

export async function GET() {
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000
  const weekStartStr = new Date(weekStart).toISOString().split('T')[0]

  const [workoutsRes, nutritionRes, recoveryRes, goals] = await Promise.all([
    db.execute({
      sql: `SELECT session_type, COUNT(*) as cnt FROM workout_sessions WHERE user_id = ? AND logged_at >= ? GROUP BY session_type`,
      args: [USER_ID, weekStart],
    }),
    db.execute({
      sql: `SELECT AVG(daily_cal) as avg_cal, AVG(daily_prot) as avg_prot, COUNT(*) as days_logged
            FROM (
              SELECT date(logged_at/1000, 'unixepoch') as day,
                SUM(total_calories) as daily_cal, SUM(total_protein) as daily_prot
              FROM meals WHERE user_id = ? AND logged_at >= ? GROUP BY day
            )`,
      args: [USER_ID, weekStart],
    }),
    db.execute({
      sql: `SELECT AVG(recovery_score) as avg_recovery FROM whoop_daily WHERE user_id = ? AND date >= ?`,
      args: [USER_ID, weekStartStr],
    }),
    getGoals(),
  ])

  const workouts = workoutsRes.rows as unknown as { session_type: string; cnt: number }[]
  const totalWorkouts = workouts.reduce((s, r) => s + Number(r.cnt), 0)

  const nut = nutritionRes.rows[0] as unknown as { avg_cal: number | null; avg_prot: number | null; days_logged: number }
  const avgCal = nut.avg_cal != null ? Math.round(Number(nut.avg_cal)) : null
  const avgProt = nut.avg_prot != null ? Math.round(Number(nut.avg_prot)) : null
  const daysLogged = Number(nut.days_logged)

  const rec = recoveryRes.rows[0] as unknown as { avg_recovery: number | null }
  const avgRecovery = rec.avg_recovery != null ? Math.round(Number(rec.avg_recovery)) : null

  const calPct = avgCal != null ? Math.round((avgCal / goals.daily_calories) * 100) : null
  const protPct = avgProt != null ? Math.round((avgProt / goals.daily_protein_g) * 100) : null

  return NextResponse.json({ totalWorkouts, workoutBreakdown: workouts, avgCal, avgProt, daysLogged, avgRecovery, calPct, protPct })
}
