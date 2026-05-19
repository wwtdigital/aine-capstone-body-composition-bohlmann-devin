import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await db.execute({
    sql: `DELETE FROM workout_sessions WHERE id = ? AND user_id = ?`,
    args: [id, USER_ID],
  })
  await db.execute({
    sql: `DELETE FROM workout_muscles WHERE session_id = ?`,
    args: [id],
  })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: { session_type?: string; duration_minutes?: number | null; notes?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { session_type, duration_minutes, notes } = body

  await db.execute({
    sql: `UPDATE workout_sessions SET
            session_type     = COALESCE(?, session_type),
            duration_minutes = COALESCE(?, duration_minutes),
            notes            = COALESCE(?, notes)
          WHERE id = ? AND user_id = ?`,
    args: [session_type ?? null, duration_minutes ?? null, notes ?? null, id, USER_ID],
  })

  return NextResponse.json({ ok: true })
}
