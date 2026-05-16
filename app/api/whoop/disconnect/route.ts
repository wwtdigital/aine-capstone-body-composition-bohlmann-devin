import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  await db.execute({
    sql: `DELETE FROM whoop_auth WHERE user_id = 'will'`,
    args: [],
  })
  return NextResponse.json({ ok: true })
}
