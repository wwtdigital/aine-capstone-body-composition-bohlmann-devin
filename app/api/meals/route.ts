import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { USER_ID } from '@/lib/userId'

type MealItem = {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  confidence: string
}

export async function POST(request: NextRequest) {
  let body: { items: MealItem[]; imageBase64?: string; mediaType?: string; loggedAt?: number; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { items, imageBase64, mediaType = 'image/jpeg', loggedAt, notes } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'items required' }, { status: 400 })
  }

  const totalCalories = items.reduce((s, i) => s + (Number(i.calories) || 0), 0)
  const totalProtein = items.reduce((s, i) => s + (Number(i.protein) || 0), 0)
  const totalCarbs = items.reduce((s, i) => s + (Number(i.carbs) || 0), 0)
  const totalFat = items.reduce((s, i) => s + (Number(i.fat) || 0), 0)

  const id = uuidv4()
  let photoUrl: string | null = null

  if (imageBase64) {
    try {
      const bytes = Buffer.from(imageBase64, 'base64')
      const blob = await put(`meals/${id}.jpg`, bytes, {
        access: 'public',
        contentType: mediaType,
      })
      photoUrl = blob.url
    } catch (err) {
      console.error('Blob upload error:', err)
    }
  }

  try {
    await db.execute({
      sql: `INSERT INTO meals (id, logged_at, photo_url, items_json, total_calories, total_protein, total_carbs, total_fat, vision_raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        loggedAt ?? Date.now(),
        photoUrl,
        JSON.stringify(items),
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        notes ? JSON.stringify({ notes }) : null,
      ],
    })
  } catch (err) {
    console.error('DB insert error:', err)
    return NextResponse.json({ error: 'Failed to save meal. Try again.' }, { status: 500 })
  }

  return NextResponse.json({ id, ok: true })
}

export async function GET() {
  const result = await db.execute({
    sql: `SELECT * FROM meals WHERE user_id = ? ORDER BY logged_at DESC LIMIT 50`,
    args: [USER_ID],
  })
  return NextResponse.json(result.rows)
}
