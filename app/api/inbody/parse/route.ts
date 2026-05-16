import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import { anthropic } from '@/lib/anthropic'

export const maxDuration = 30

const EXTRACT_PROMPT = `Extract InBody report fields from this PDF text.
Return JSON: {"reading_date": "YYYY-MM-DD", "weight_kg": number|null, "body_fat_pct": number|null, "lean_mass_kg": number|null, "body_water_kg": number|null, "visceral_fat_level": number|null}
If a field is not found, return null. Do not guess. reading_date must be ISO 8601 (YYYY-MM-DD).`

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

  let pdfText: string
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    pdfText = result.text
  } catch (err) {
    console.error('PDF parse error:', err)
    return NextResponse.json({ error: 'Could not read PDF. Make sure it is a valid InBody report.' }, { status: 422 })
  }

  if (!pdfText || pdfText.trim().length < 50) {
    return NextResponse.json({ error: 'PDF appears to have no readable text (may be image-only).' }, { status: 422 })
  }

  let raw: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `${EXTRACT_PROMPT}\n\n---\n${pdfText.slice(0, 4000)}`,
        },
      ],
    })
    raw = response.content[0].type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('Claude extraction error:', err)
    return NextResponse.json({ error: 'Extraction failed. Try again.' }, { status: 502 })
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return NextResponse.json({ error: 'Could not extract fields from this PDF.', raw }, { status: 422 })
  }

  let parsed: ParsedReading | null
  try {
    parsed = validateParsed(JSON.parse(jsonMatch[0]))
  } catch {
    return NextResponse.json({ error: 'Could not extract fields from this PDF.', raw }, { status: 422 })
  }

  if (!parsed) {
    return NextResponse.json({ error: 'Could not extract fields from this PDF.' }, { status: 422 })
  }

  return NextResponse.json({ ...parsed, raw_extracted_json: raw, filename: file.name })
}
