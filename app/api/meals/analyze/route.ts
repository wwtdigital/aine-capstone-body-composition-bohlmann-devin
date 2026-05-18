import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 30

const VISION_PROMPT = `You are analyzing a photo of a meal. Identify each food item visible.
For each item, estimate portion size and calories/protein/carbs/fat.
Mark confidence (low/medium/high) for each item.
If unclear, say so — do not hallucinate.
Output ONLY JSON matching this schema:
{
  "items": [
    {"name": "...", "portion": "...", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "confidence": "low|medium|high"}
  ],
  "notes": "..."
}`

type MediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

function validateMealJson(raw: unknown): { items: MealItem[]; notes: string } | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (!Array.isArray(obj.items)) return null
  const items = obj.items.map((item: unknown) => {
    const i = item as Record<string, unknown>
    return {
      name: String(i.name ?? ''),
      portion: String(i.portion ?? ''),
      calories: Number(i.calories ?? 0),
      protein: Number(i.protein ?? 0),
      carbs: Number(i.carbs ?? 0),
      fat: Number(i.fat ?? 0),
      confidence: (['low', 'medium', 'high'].includes(String(i.confidence)) ? i.confidence : 'low') as 'low' | 'medium' | 'high',
    }
  })
  return { items, notes: String(obj.notes ?? '') }
}

export type MealItem = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: 'low' | 'medium' | 'high'
}

const TEXT_PROMPT = (description: string) =>
  `You are estimating macros for a described meal. The user says: "${description}"
Break it into individual items with estimated portions and calories/protein/carbs/fat.
Be realistic with portion sizes. Mark confidence appropriately.
Output ONLY JSON matching this schema:
{"items":[{"name":"...","portion":"...","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":"low|medium|high"}],"notes":"..."}`

export async function POST(request: NextRequest) {
  let body: { imageBase64?: string; mediaType?: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageBase64, mediaType = 'image/jpeg', description } = body

  if (!imageBase64 && !description) {
    return NextResponse.json({ error: 'imageBase64 or description required' }, { status: 400 })
  }

  let raw: string
  try {
    if (description) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: TEXT_PROMPT(description) }],
      })
      raw = response.content[0].type === 'text' ? response.content[0].text : ''
    } else {
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
                  media_type: mediaType as MediaType,
                  data: imageBase64!,
                },
              },
              { type: 'text', text: VISION_PROMPT },
            ],
          },
        ],
      })
      raw = response.content[0].type === 'text' ? response.content[0].text : ''
    }
  } catch (err) {
    console.error('Claude error:', err)
    return NextResponse.json({ error: 'Analysis failed. Try again.' }, { status: 502 })
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: "Couldn't parse the response. Try again or log manually.", raw }, { status: 422 })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: "Couldn't parse the response. Try again or log manually.", raw }, { status: 422 })
  }

  const meal = validateMealJson(parsed)
  if (!meal) {
    return NextResponse.json({ error: "Couldn't parse the response. Try again or log manually.", raw }, { status: 422 })
  }

  return NextResponse.json(meal)
}
