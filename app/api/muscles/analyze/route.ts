import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { anthropic } from '@/lib/anthropic'
import { USER_ID } from '@/lib/userId'

const PROMPT = `You are analyzing a physique photo of a hybrid athlete (5x lifting + 3x soccer per week).
Identify visible muscle groups and rate their relative development on a 1-10 scale where 5 = balanced/average for an athletic person.
Scores >6 mean relatively overdeveloped compared to the athlete's overall physique.
Scores <4 mean relatively underdeveloped compared to the athlete's overall physique.
Only score muscles you can actually see in this photo.
Return ONLY valid JSON:
{
  "scores": {
    "chest": 6.5,
    "front-delt": 7,
    ...
  },
  "notes": "brief overall assessment",
  "visibleMuscles": ["chest", "front-delt", ...]
}
Use only these muscle IDs: chest, front-delt, biceps, abs, quads, hip-flexors, calves, traps, rear-delt, lats, triceps, lower-back, glutes, hamstrings
Only include muscles you can see. Omit the rest.`

async function ensureTable() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS muscle_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      assessed_at INTEGER NOT NULL,
      scores_json TEXT NOT NULL,
      notes TEXT
    )`,
    args: [],
  })
}

export async function POST(request: NextRequest) {
  let body: { imageBase64: string; mediaType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { imageBase64, mediaType = 'image/jpeg' } = body
  if (!imageBase64) {
    return NextResponse.json({ error: 'imageBase64 required' }, { status: 400 })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed: { scores: Record<string, number>; notes: string; visibleMuscles: string[] }
  try {
    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return NextResponse.json({ error: 'Failed to parse Claude response', raw: text }, { status: 500 })
  }

  await ensureTable()

  const id = crypto.randomUUID()
  const assessedAt = Date.now()

  await db.execute({
    sql: `INSERT INTO muscle_assessments (id, user_id, assessed_at, scores_json, notes)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, USER_ID, assessedAt, JSON.stringify(parsed.scores), parsed.notes ?? null],
  })

  return NextResponse.json({
    scores: parsed.scores,
    notes: parsed.notes,
    assessedAt,
  })
}
