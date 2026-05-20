import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { anthropic } from '@/lib/anthropic'
import { USER_ID } from '@/lib/userId'
import { getPersonalContext } from '@/lib/getPersonalContext'

export const maxDuration = 60

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    args: [],
  })
}

export async function POST(request: NextRequest) {
  let body: { message: string; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { message } = body
  if (!message?.trim()) return NextResponse.json({ error: 'message required' }, { status: 400 })

  const sessionId = body.sessionId || crypto.randomUUID()

  // Must create table before querying it
  await ensureTable()

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const [GOALS, personalContext, mealsResult, inbodyResult, historyResult, whoopResult, workoutResult, firstMealDateResult] = await Promise.all([
    getGoals(),
    getPersonalContext(),
    db.execute({
      sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as cal, ROUND(SUM(total_protein)) as prot, ROUND(SUM(total_carbs)) as carbs, ROUND(SUM(total_fat)) as fat, COUNT(*) as meals FROM meals WHERE user_id = ? AND logged_at >= ? GROUP BY day ORDER BY day DESC`,
      args: [USER_ID, thirtyDaysAgo],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = ? ORDER BY reading_date DESC LIMIT 5`,
      args: [USER_ID],
    }),
    db.execute({
      sql: `SELECT role, content FROM chat_history WHERE user_id = ? AND id LIKE ? ORDER BY created_at ASC LIMIT 20`,
      args: [USER_ID, `${sessionId}%`],
    }),
    db.execute({
      sql: `SELECT recovery_score, strain, hrv_ms, sleep_minutes FROM whoop_daily WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
      args: [USER_ID],
    }),
    db.execute({
      sql: `SELECT session_type, duration_minutes, notes, date(logged_at/1000, 'unixepoch') as day FROM workout_sessions WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC LIMIT 14`,
      args: [USER_ID, thirtyDaysAgo],
    }),
    db.execute({
      sql: `SELECT MIN(date(logged_at/1000, 'unixepoch')) as first_day FROM meals WHERE user_id = ?`,
      args: [USER_ID],
    }),
  ])

  const mealRows = mealsResult.rows as unknown as { day: string; cal: number; prot: number; carbs: number; fat: number; meals: number }[]
  const inbodyRows = inbodyResult.rows as unknown as { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }[]
  const historyRows = historyResult.rows as unknown as { role: string; content: string }[]
  const whoopRow = (whoopResult.rows as unknown as { recovery_score: number | null; strain: number | null; hrv_ms: number | null; sleep_minutes: number | null }[])[0] ?? null
  const workoutRows = workoutResult.rows as unknown as { session_type: string; duration_minutes: number | null; notes: string | null; strain: number | null; day: string }[]
  const firstMealDate = (firstMealDateResult.rows[0] as unknown as { first_day: string | null })?.first_day ?? null

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

  const whoopSummary = whoopRow
    ? `Recovery: ${whoopRow.recovery_score ?? 'N/A'}/100, Strain: ${whoopRow.strain ?? 'N/A'}, HRV: ${whoopRow.hrv_ms ?? 'N/A'}ms, Sleep: ${whoopRow.sleep_minutes != null ? Math.round(whoopRow.sleep_minutes / 60 * 10) / 10 + 'h' : 'N/A'}`
    : 'No Whoop data available'

  const workoutSummary = workoutRows.length > 0
    ? workoutRows.map(r => {
        const parts = [`${r.day}: ${r.session_type}`]
        if (r.duration_minutes) parts.push(`${r.duration_minutes} min`)
        if (r.strain != null) parts.push(`strain ${r.strain.toFixed(1)}`)
        if (r.notes) parts.push(`(${r.notes})`)
        return parts.join(', ')
      }).join('\n')
    : 'No workouts logged'

  const systemPrompt = `You are Will Bohlmann's personal body composition coach embedded in his fitness app. You have direct access to his logged data. Be conversational, specific, and direct. Use his actual numbers when answering — don't be vague.

Will is a hybrid athlete: 5x lifting + 3x soccer per week. Tailor advice to that training load.

You have memory of this conversation across sessions. Reference previous exchanges when relevant.
${personalContext ? `\nPERSONAL CONTEXT (medications, supplements, habits, history — treat as ground truth):\n${personalContext}\n` : ''}
WILL'S GOALS:
- Target weight: ${GOALS.target_weight_lbs} lbs
- Target body fat: ${GOALS.target_body_fat_pct}%
- Daily calorie target: ${GOALS.daily_calories} kcal
- Daily protein target: ${GOALS.daily_protein_g}g

TODAY'S WHOOP DATA:
${whoopSummary}

INBODY READINGS (most recent first):
${inbodySummary}

RECENT WORKOUTS (last 30 days, most recent first):
${workoutSummary}

NUTRITION LOG (last 14 logged days, most recent first):
${nutritionSummary}

TRACKING START DATE: ${firstMealDate ?? 'unknown'} — nutrition data only exists from this date forward. Do not treat missing data before this date as a logging gap or poor adherence.

Keep responses concise — 2-4 sentences unless detail is requested. Use his actual numbers. Don't hedge or add disclaimers. If data is missing, say so plainly.`

  // Save the user message before calling Claude
  const userMsgId = `${sessionId}-${Date.now()}-u`
  await db.execute({
    sql: `INSERT INTO chat_history (id, user_id, role, content, created_at) VALUES (?, ?, 'user', ?, ?)`,
    args: [userMsgId, USER_ID, message.trim(), Date.now()],
  })

  const messages = [
    ...historyRows.map(r => ({ role: r.role as 'user' | 'assistant', content: r.content })),
    { role: 'user' as const, content: message.trim() },
  ]

  let claudeStream: ReturnType<typeof anthropic.messages.stream>
  try {
    claudeStream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    })
  } catch (err) {
    console.error('Chat stream init error:', err)
    return NextResponse.json({ error: 'Failed to start response. Try again.' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullReply = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of claudeStream.textStream) {
          fullReply += text
          controller.enqueue(encoder.encode(text))
        }
      } catch (err) {
        console.error('Stream error:', err)
        controller.enqueue(encoder.encode('\n[response interrupted]'))
      } finally {
        controller.close()
      }
    },
  })

  // Save assistant reply after stream completes (non-blocking)
  claudeStream.finalMessage()
    .then(async () => {
      if (!fullReply) return
      const assistantMsgId = `${sessionId}-${Date.now()}-a`
      await db.execute({
        sql: `INSERT INTO chat_history (id, user_id, role, content, created_at) VALUES (?, ?, 'assistant', ?, ?)`,
        args: [assistantMsgId, USER_ID, fullReply, Date.now()],
      })
    })
    .catch((err: unknown) => console.error('Failed to save assistant reply:', err))

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
