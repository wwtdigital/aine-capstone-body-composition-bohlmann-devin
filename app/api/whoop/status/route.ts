import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isWhoopConnected } from '@/lib/whoop'

export async function GET() {
  const connected = await isWhoopConnected()

  if (!connected) {
    return NextResponse.json({ connected: false })
  }

  const result = await db.execute({
    sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 7`,
    args: [],
  })

  return NextResponse.json({
    connected: true,
    recent: result.rows,
  })
}
