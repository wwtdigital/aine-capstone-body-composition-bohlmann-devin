import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isWhoopConnected } from '@/lib/whoop'
import { USER_ID } from '@/lib/userId'

export async function GET() {
  const connected = await isWhoopConnected()

  if (!connected) {
    return NextResponse.json({ connected: false })
  }

  const [recentResult, latestDateResult] = await Promise.all([
    db.execute({
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes FROM whoop_daily WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
      args: [USER_ID],
    }),
    db.execute({
      sql: `SELECT date FROM whoop_daily WHERE user_id = ? ORDER BY date DESC LIMIT 1`,
      args: [USER_ID],
    }),
  ])

  const latestDataDate = (latestDateResult.rows[0] as any)?.date ?? null

  return NextResponse.json({
    connected: true,
    recent: recentResult.rows,
    latestDataDate,
  })
}
