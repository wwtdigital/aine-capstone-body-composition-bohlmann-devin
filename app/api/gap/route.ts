import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 60

type GapAnalysis = {
  headline: string
  timeline: string
  gaps: { area: string; severity: 'high' | 'medium' | 'low'; detail: string }[]
  recommendations: { action: string; detail: string; priority: 'high' | 'medium' | 'low' }[]
  coaching_note: string
}

export async function GET() {
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000

  const [GOALS, nutritionResult, inbodyResult] = await Promise.all([
    getGoals(),
    db.execute({
      sql: `SELECT date(logged_at/1000, 'unixepoch') as day, SUM(total_calories) as cal, SUM(total_protein) as prot FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day ORDER BY day DESC`,
      args: [fourteenDaysAgo],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg, body_water_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 3`,
      args: [],
    }),
  ])

  const nutritionRows = nutritionResult.rows as unknown as { day: string; cal: number; prot: number }[]
  const inbodyRows = inbodyResult.rows as unknown as { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null; body_water_kg: number | null }[]

  const daysWithData = nutritionRows.length
  const avgCal = daysWithData > 0 ? Math.round(nutritionRows.reduce((s, r) => s + Number(r.cal), 0) / daysWithData) : 0
  const avgProt = daysWithData > 0 ? Math.round(nutritionRows.reduce((s, r) => s + Number(r.prot), 0) / daysWithData) : 0

  const latest = inbodyRows[0]
  const kgToLbs = (kg: number) => Math.round(kg * 2.20462)

  const inbodyContext = inbodyRows.length > 0
    ? inbodyRows.map((r, i) => {
        const label = i === 0 ? 'Most recent' : `${i + 1} readings ago`
        const date = new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        const weightLbs = r.weight_kg != null ? kgToLbs(r.weight_kg) : 'N/A'
        const leanLbs = r.lean_mass_kg != null ? kgToLbs(r.lean_mass_kg) : 'N/A'
        return `${label} (${date}): weight ${weightLbs} lbs, body fat ${r.body_fat_pct ?? 'N/A'}%, lean mass ${leanLbs} lbs`
      }).join('\n')
    : 'No InBody readings recorded yet'

  const nutritionContext = daysWithData > 0
    ? `${daysWithData} days logged in last 14 days\nAverage daily calories: ${avgCal} kcal (${Math.round((avgCal / GOALS.daily_calories) * 100)}% of ${GOALS.daily_calories} goal)\nAverage daily protein: ${avgProt}g (${Math.round((avgProt / GOALS.daily_protein_g) * 100)}% of ${GOALS.daily_protein_g}g goal)`
    : 'No meals logged in the last 14 days'

  const currentWeightLbs = latest?.weight_kg != null ? kgToLbs(latest.weight_kg) : null
  const weightDelta = currentWeightLbs != null ? currentWeightLbs - GOALS.target_weight_lbs : null
  const bfDelta = latest?.body_fat_pct != null ? (latest.body_fat_pct - GOALS.target_body_fat_pct).toFixed(1) : null

  const prompt = `You are a precision body recomposition coach analyzing data for Will Bohlmann. Be direct, data-driven, and specific. No fluff.

GOALS:
- Target weight: ${GOALS.target_weight_lbs} lbs
- Target body fat: ${GOALS.target_body_fat_pct}%
- Daily calories: ${GOALS.daily_calories} kcal
- Daily protein: ${GOALS.daily_protein_g}g

CURRENT BODY COMPOSITION (InBody readings):
${inbodyContext}
${weightDelta != null ? `Weight gap: ${weightDelta > 0 ? '+' : ''}${weightDelta} lbs from goal` : ''}
${bfDelta ? `Body fat gap: ${Number(bfDelta) > 0 ? '+' : ''}${bfDelta}% from goal` : ''}

NUTRITION (last 14 days):
${nutritionContext}

Return ONLY valid JSON — no markdown, no explanation, just the JSON object:
{
  "headline": "one sentence, specific, data-driven summary of where Will is relative to his goals",
  "timeline": "realistic estimated time to reach goals at current trajectory — be honest, not motivational",
  "gaps": [
    { "area": "string (e.g. Protein, Body Fat, Caloric Surplus)", "severity": "high|medium|low", "detail": "one specific sentence with numbers" }
  ],
  "recommendations": [
    { "action": "short title (3-5 words)", "detail": "specific actionable instruction with a number or target", "priority": "high|medium|low" }
  ],
  "coaching_note": "2-3 sentences: honest assessment of the data, what's working, what isn't"
}`

  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    raw = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('Claude gap analysis error:', err)
    return NextResponse.json({ error: 'Analysis failed. Try again.' }, { status: 502 })
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not parse analysis.', raw }, { status: 422 })
  }

  let analysis: GapAnalysis
  try {
    analysis = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Could not parse analysis.', raw }, { status: 422 })
  }

  return NextResponse.json({
    analysis,
    context: {
      days_with_data: daysWithData,
      avg_calories: avgCal,
      avg_protein: avgProt,
      latest_reading: latest ?? null,
      generated_at: new Date().toISOString(),
    },
  })
}
