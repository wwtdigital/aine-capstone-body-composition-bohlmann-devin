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
