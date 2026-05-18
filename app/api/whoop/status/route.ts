import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isWhoopConnected } from '@/lib/whoop'

export async function GET() {
  const connected = await isWhoopConnected()

  if (!connected) {
    return NextResponse.json({ connected: false })
  }

  const [recentResult, latestDateResult] = await Promise.all([
    db.execute({
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 7`,
      args: [],
    }),
    db.execute({
      sql: `SELECT date FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 1`,
      args: [],
    }),
  ])

  const latestDataDate = (latestDateResult.rows[0] as any)?.date ?? null

  return NextResponse.json({
    connected: true,
    recent: recentResult.rows,
    latestDataDate,
  })
}
