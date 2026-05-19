import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({
    sql: `DELETE FROM meals WHERE id = ? AND user_id = ?`,
    args: [id, USER_ID],
  })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: { total_calories?: number; total_protein?: number; total_carbs?: number; total_fat?: number; items_json?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { total_calories, total_protein, total_carbs, total_fat, items_json } = body

  await db.execute({
    sql: `UPDATE meals SET
            total_calories = COALESCE(?, total_calories),
            total_protein  = COALESCE(?, total_protein),
            total_carbs    = COALESCE(?, total_carbs),
            total_fat      = COALESCE(?, total_fat),
            items_json     = COALESCE(?, items_json)
          WHERE id = ? AND user_id = ?`,
    args: [
      total_calories ?? null,
      total_protein ?? null,
      total_carbs ?? null,
      total_fat ?? null,
      items_json ?? null,
      id,
      USER_ID,
    ],
  })

  return NextResponse.json({ ok: true })
}
