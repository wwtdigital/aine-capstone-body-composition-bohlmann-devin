import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 45

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  let body: { messages: Message[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { messages } = body
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 })

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const [mealsResult, inbodyResult] = await Promise.all([
    db.execute({
      sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as cal, ROUND(SUM(total_protein)) as prot, ROUND(SUM(total_carbs)) as carbs, ROUND(SUM(total_fat)) as fat, COUNT(*) as meals FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day ORDER BY day DESC`,
      args: [thirtyDaysAgo],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 5`,
      args: [],
    }),
  ])

  const mealRows = mealsResult.rows as unknown as { day: string; cal: number; prot: number; carbs: number; fat: number; meals: number }[]
  const inbodyRows = inbodyResult.rows as unknown as { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }[]

  const nutritionSummary = mealRows.length > 0
    ? mealRows.slice(0, 14).map(r =>
        `${r.day}: ${r.cal} cal, ${r.prot}g protein, ${r.carbs}g carbs, ${r.fat}g fat (${r.meals} meal${r.meals !== 1 ? 's' : ''})`
      ).join('\n')
    : 'No meals logged in the last 30 days'

  const inbodySummary = inbodyRows.length > 0
    ? inbodyRows.map(r => {
        const date = new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return `${date}: ${r.weight_kg ?? 'N/A'} kg, ${r.body_fat_pct ?? 'N/A'}% BF, ${r.lean_mass_kg ?? 'N/A'} kg lean`
      }).join('\n')
    : 'No InBody readings recorded'

  const systemPrompt = `You are Will Bohlmann's personal body composition coach embedded in his fitness app. You have direct access to his logged data. Be conversational, specific, and direct. Use his actual numbers when answering — don't be vague.

WILL'S GOALS:
- Target weight: ${GOALS.weight_kg} kg (180 lbs)
- Target body fat: ${GOALS.body_fat_pct}%
- Daily calorie target: ${GOALS.daily_calories} kcal
- Daily protein target: ${GOALS.daily_protein_g}g

INBODY READINGS (most recent first):
${inbodySummary}

NUTRITION LOG (last 14 logged days, most recent first):
${nutritionSummary}

Keep responses concise — 2-4 sentences unless detail is requested. Use his actual numbers. Don't hedge or add disclaimers. If data is missing, say so plainly.`

  let reply: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    reply = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: 'Failed to get response. Try again.' }, { status: 502 })
  }

  return NextResponse.json({ reply })
}
