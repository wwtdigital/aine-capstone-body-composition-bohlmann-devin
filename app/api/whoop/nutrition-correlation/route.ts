import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

type Row = {
  strain: number
  date: string
  protein: number
  calories: number
}

export async function GET() {
  const result = await db.execute({
    sql: `
      SELECT
        w.strain,
        w.date,
        COALESCE(SUM(m.total_protein), 0) as protein,
        COALESCE(SUM(m.total_calories), 0) as calories
      FROM whoop_daily w
      LEFT JOIN meals m ON date(m.logged_at/1000, 'unixepoch') = w.date AND m.user_id = w.user_id
      WHERE w.user_id = ? AND w.strain IS NOT NULL
      GROUP BY w.date
      ORDER BY w.date DESC
      LIMIT 60
    `,
    args: [USER_ID],
  })

  const rows = result.rows as unknown as Row[]

  if (rows.length < 3) {
    return NextResponse.json({ hasData: false })
  }

  const high = rows.filter((r) => r.strain >= 8)
  const low = rows.filter((r) => r.strain < 8)

  function avg(arr: Row[], key: keyof Pick<Row, 'protein' | 'calories'>) {
    if (arr.length === 0) return 0
    return arr.reduce((sum, r) => sum + r[key], 0) / arr.length
  }

  return NextResponse.json({
    hasData: true,
    highStrain: {
      protein: avg(high, 'protein'),
      calories: avg(high, 'calories'),
      days: high.length,
    },
    lowStrain: {
      protein: avg(low, 'protein'),
      calories: avg(low, 'calories'),
      days: low.length,
    },
  })
}
