import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 30

export async function GET() {
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  const [nutritionResult, whoopResult, inbodyResult] = await Promise.all([
    db.execute({
      sql: `SELECT ROUND(AVG(total_calories)) as avg_cal, ROUND(AVG(total_protein)) as avg_prot FROM meals WHERE user_id = 'will' AND logged_at >= ?`,
      args: [threeDaysAgo],
    }),
    db.execute({
      sql: `SELECT recovery_score, hrv_ms, sleep_minutes FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 1`,
      args: [],
    }),
    db.execute({
      sql: `SELECT weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 1`,
      args: [],
    }),
  ])

  const n = nutritionResult.rows[0] as any
  const w = whoopResult.rows[0] as any
  const b = inbodyResult.rows[0] as any

  const context = [
    n?.avg_cal ? `Avg calories (3d): ${n.avg_cal} kcal (goal: ${GOALS.daily_calories})` : null,
    n?.avg_prot ? `Avg protein (3d): ${n.avg_prot}g (goal: ${GOALS.daily_protein_g}g)` : null,
    w?.recovery_score ? `Recovery: ${w.recovery_score}/100, HRV: ${w.hrv_ms}ms` : null,
    b?.weight_kg ? `Weight: ${b.weight_kg}kg, BF: ${b.body_fat_pct}%, Lean: ${b.lean_mass_kg}kg` : null,
  ].filter(Boolean).join('\n')

  if (!context) {
    return NextResponse.json({ insight: "Log your first meal to get personalized insights." })
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are a body composition coach. Given this data:\n${context}\n\nWrite ONE sentence of specific, actionable, encouraging insight for today. Be direct and data-driven. No greeting, no "Great job", just the insight.`
      }]
    })
    const insight = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return NextResponse.json({ insight })
  } catch {
    return NextResponse.json({ insight: "Keep logging consistently — every data point sharpens your coaching." })
  }
}
