import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export async function POST() {
  await db.execute({
    sql: `DELETE FROM whoop_auth WHERE user_id = ?`,
    args: [USER_ID],
  })
  return NextResponse.json({ ok: true })
}
