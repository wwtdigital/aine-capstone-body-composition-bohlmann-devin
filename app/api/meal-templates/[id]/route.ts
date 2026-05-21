import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

type Template = {
  id: string
  user_id: string
  name: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  items_json: string | null
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const result = await db.execute({
    sql: `SELECT * FROM meal_templates WHERE id = ? AND user_id = ?`,
    args: [id, USER_ID],
  })

  const template = result.rows[0] as unknown as Template | undefined
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  await db.execute({
    sql: `UPDATE meal_templates SET use_count = use_count + 1 WHERE id = ? AND user_id = ?`,
    args: [id, USER_ID],
  })

  await db.execute({
    sql: `INSERT INTO meals (id, user_id, logged_at, total_calories, total_protein, total_carbs, total_fat, items_json, vision_raw_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      USER_ID,
      Date.now(),
      template.total_calories,
      template.total_protein,
      template.total_carbs,
      template.total_fat,
      template.items_json,
      null,
    ],
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({
    sql: `DELETE FROM meal_templates WHERE id = ? AND user_id = ?`,
    args: [id, USER_ID],
  })
  return NextResponse.json({ ok: true })
}
