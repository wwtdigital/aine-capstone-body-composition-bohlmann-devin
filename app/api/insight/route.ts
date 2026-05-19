import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 30

type Brief = {
  focus: string
  day_type: 'lift_day' | 'soccer_day' | 'rest_day' | 'recovery_focus' | 'refuel_day' | 'game_day'
  headline: string
  actions: Array<{ label: string; reason: string }>
  trend: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export async function GET() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
  const todayStart = new Date().setUTCHours(0, 0, 0, 0)
  const dayOfWeek = DAY_NAMES[new Date().getDay()]

  const [GOALS, nutritionAvgResult, todayNutritionResult, inbodyResult, whoopResult, workoutResult] = await Promise.all([
    getGoals(),
    db.execute({
      sql: `SELECT
              ROUND(AVG(total_calories)) as avg_cal,
              ROUND(AVG(total_protein)) as avg_prot,
              COUNT(*) as days_logged
            FROM (
              SELECT date(logged_at/1000,'unixepoch') as day,
                     SUM(total_calories) as total_calories,
                     SUM(total_protein) as total_protein
              FROM meals WHERE user_id='will' AND logged_at >= ?
              GROUP BY day
            )`,
      args: [sevenDaysAgo],
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(total_calories),0) as cal, COALESCE(SUM(total_protein),0) as prot
            FROM meals WHERE user_id='will' AND logged_at >= ?`,
      args: [todayStart],
    }),
    db.execute({
      sql: `SELECT weight_kg, body_fat_pct, lean_mass_kg, reading_date
            FROM inbody_readings WHERE user_id='will' ORDER BY reading_date DESC LIMIT 2`,
      args: [],
    }),
    db.execute({
      sql: `SELECT date, recovery_score, hrv_ms, rhr, sleep_minutes, sleep_efficiency, strain
            FROM whoop_daily WHERE user_id='will' ORDER BY date DESC LIMIT 3`,
      args: [],
    }),
    db.execute({
      sql: `SELECT session_type, logged_at, notes
            FROM workout_sessions WHERE user_id='will' AND logged_at >= ?
            ORDER BY logged_at DESC LIMIT 5`,
      args: [sevenDaysAgo],
    }),
  ])

  const avgN = nutritionAvgResult.rows[0] as any
  const todayN = todayNutritionResult.rows[0] as any
  const inbody = inbodyResult.rows as any[]
  const whoopRows = whoopResult.rows as any[]
  const workouts = workoutResult.rows as any[]

  const hasAnyData = avgN?.days_logged > 0 || inbody.length > 0 || whoopRows.length > 0

  if (!hasAnyData) {
    return NextResponse.json({
      brief: null,
      insight: 'Log your first meal to get personalized daily coaching.',
    })
  }

  // Build context for Claude
  const lines: string[] = [`Today is ${dayOfWeek}.`]

  if (avgN?.days_logged > 0) {
    lines.push(`Nutrition (7-day avg): ${avgN.avg_cal} kcal/day (goal: ${GOALS.daily_calories}), ${avgN.avg_prot}g protein/day (goal: ${GOALS.daily_protein_g}g). Logged ${avgN.days_logged}/7 days.`)
  }

  const todayCal = Math.round(Number(todayN?.cal) || 0)
  const todayProt = Math.round(Number(todayN?.prot) || 0)
  if (todayCal > 0) {
    lines.push(`Today so far: ${todayCal} kcal, ${todayProt}g protein.`)
  } else {
    lines.push('Today: no meals logged yet.')
  }

  if (inbody.length > 0) {
    const latest = inbody[0]
    const prev = inbody[1]
    const kgToLbs = (kg: number) => Math.round(kg * 2.20462)
    let trend = ''
    if (prev?.weight_kg != null && latest?.weight_kg != null) {
      const diffLbs = kgToLbs(latest.weight_kg) - kgToLbs(prev.weight_kg)
      trend = ` (${diffLbs > 0 ? '+' : ''}${diffLbs}lbs since last scan)`
    }
    const weightLbs = latest.weight_kg != null ? kgToLbs(latest.weight_kg) : null
    const leanLbs = latest.lean_mass_kg != null ? kgToLbs(latest.lean_mass_kg) : null
    lines.push(`Body comp: ${weightLbs}lbs${trend}, ${latest.body_fat_pct}% BF, ${leanLbs}lbs lean mass. Goal: ${GOALS.target_weight_lbs}lbs, ${GOALS.target_body_fat_pct}% BF.`)
  }

  if (whoopRows.length > 0) {
    const latest = whoopRows[0]
    const hrv30 = whoopRows.map((r: any) => r.hrv_ms).filter(Boolean)
    const avgHrv = hrv30.length > 0 ? Math.round(hrv30.reduce((a: number, b: number) => a + b, 0) / hrv30.length) : null
    const hrvNote = avgHrv && latest.hrv_ms ? ` (${latest.hrv_ms > avgHrv ? '+' : ''}${Math.round(latest.hrv_ms - avgHrv)}ms vs recent avg)` : ''
    lines.push(`Recovery (${latest.date}): score ${latest.recovery_score}/100, HRV ${latest.hrv_ms ? Math.round(latest.hrv_ms) : '—'}ms${hrvNote}, sleep ${latest.sleep_minutes ? `${Math.floor(latest.sleep_minutes / 60)}h${latest.sleep_minutes % 60}m` : '—'}, strain ${latest.strain?.toFixed(1) ?? '—'}.`)
  }

  if (workouts.length > 0) {
    const recentTypes = workouts.map((w: any) => w.session_type).join(', ')
    lines.push(`Recent workouts (7 days): ${recentTypes}.`)
  } else {
    lines.push('No workouts logged in the last 7 days.')
  }

  lines.push(`Athlete profile: hybrid (5x lifting + 3x soccer/week).`)

  const contextStr = lines.join('\n')

  const systemPrompt = `You are a body composition and performance coach for a hybrid athlete (weightlifting + soccer).
Analyze their daily data and return a structured JSON daily brief.

Return ONLY valid JSON in this exact format:
{
  "focus": "2-4 word focus label for today (e.g. 'Refuel + Lift', 'Recovery Day', 'Protein Push')",
  "day_type": "one of: lift_day | soccer_day | rest_day | recovery_focus | refuel_day | game_day",
  "headline": "1-2 sentences, data-driven, specific coaching insight for today. Reference actual numbers.",
  "actions": [
    {"label": "specific action (under 8 words)", "reason": "data reason why (under 12 words)"},
    {"label": "specific action (under 8 words)", "reason": "data reason why (under 12 words)"}
  ],
  "trend": "one sentence on weekly/longer-term trajectory based on available data"
}

Be specific and data-driven. Reference real numbers. No generic advice.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: contextStr,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON in response')

    const brief: Brief = JSON.parse(match[0])
    return NextResponse.json({ brief })
  } catch (err) {
    console.error('Daily brief error:', err)
    return NextResponse.json({
      brief: null,
      insight: 'Keep logging consistently — every data point sharpens your coaching.',
    })
  }
}
