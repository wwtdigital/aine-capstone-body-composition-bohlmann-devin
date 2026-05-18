import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const result = await db.execute({
      sql: `SELECT wm.muscle_id, MAX(ws.logged_at) as last_trained_at, wm.volume
            FROM workout_muscles wm
            JOIN workout_sessions ws ON ws.id = wm.session_id
            WHERE ws.user_id = 'will'
            GROUP BY wm.muscle_id`,
      args: [],
    })

    const data: Record<string, { lastTrainedAt: number; volume: 'low' | 'medium' | 'high' }> = {}
    for (const row of result.rows) {
      data[row.muscle_id as string] = {
        lastTrainedAt: row.last_trained_at as number,
        volume: row.volume as 'low' | 'medium' | 'high',
      }
    }

    return NextResponse.json(data)
  } catch {
    // Tables may not exist yet — return empty object as graceful fallback
    return NextResponse.json({})
  }
}
