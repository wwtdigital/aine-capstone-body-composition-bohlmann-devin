import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 30

const EXTRACT_PROMPT = `This is an InBody body composition report. Extract the measurement fields.
Return JSON only: {"reading_date": "YYYY-MM-DD", "weight_kg": number|null, "body_fat_pct": number|null, "lean_mass_kg": number|null, "body_water_kg": number|null, "visceral_fat_level": number|null}
If a field is not visible or unclear, return null. Do not guess. reading_date must be ISO 8601 (YYYY-MM-DD).`

type ParsedReading = {
  reading_date: string | null
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
  body_water_kg: number | null
  visceral_fat_level: number | null
}

function validateParsed(raw: unknown): ParsedReading | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  return {
    reading_date: typeof obj.reading_date === 'string' ? obj.reading_date : null,
    weight_kg: typeof obj.weight_kg === 'number' ? obj.weight_kg : null,
    body_fat_pct: typeof obj.body_fat_pct === 'number' ? obj.body_fat_pct : null,
    lean_mass_kg: typeof obj.lean_mass_kg === 'number' ? obj.lean_mass_kg : null,
    body_water_kg: typeof obj.body_water_kg === 'number' ? obj.body_water_kg : null,
    visceral_fat_level: typeof obj.visceral_fat_level === 'number' ? obj.visceral_fat_level : null,
  }
}

function extractJson(raw: string): ParsedReading | null {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return validateParsed(JSON.parse(match[0]))
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'file field required' }, { status: 400 })
  }

  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (!isImage && !isPdf) {
    return NextResponse.json({ error: 'Unsupported file type. Upload a PDF or image.' }, { status: 400 })
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    type ContentBlock =
      | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; data: string } }
      | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } }
      | { type: 'text'; text: string }

    let fileBlock: ContentBlock
    if (isImage) {
      const allowed: Array<'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      const mediaType = (allowed.includes(file.type as 'image/png') ? file.type : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      fileBlock = { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
    } else {
      fileBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: [fileBlock as any, { type: 'text', text: EXTRACT_PROMPT }],
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = extractJson(raw)
    if (!parsed) {
      return NextResponse.json({ error: 'Could not extract fields from this file.' }, { status: 422 })
    }

    return NextResponse.json({ ...parsed, filename: file.name })
  } catch (err) {
    console.error('InBody parse error:', err)
    return NextResponse.json({ error: 'Extraction failed. Try again.' }, { status: 502 })
  }
}
