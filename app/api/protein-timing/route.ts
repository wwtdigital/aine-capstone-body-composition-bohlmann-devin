import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

type Row = { logged_at: number; total_protein: number }

export async function GET() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000

  const result = await db.execute({
    sql: `SELECT logged_at, total_protein FROM meals WHERE user_id = ? AND logged_at >= ? AND total_protein >= 20 ORDER BY logged_at ASC`,
    args: [USER_ID, cutoff],
  })

  const rows = result.rows as unknown as Row[]

  const byDay: Record<string, number[]> = {}
  for (const row of rows) {
    const day = new Date(row.logged_at).toLocaleDateString('en-CA')
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(row.logged_at)
  }

  const daysWithMultiple = Object.values(byDay).filter(ts => ts.length >= 2)
  const daysAnalyzed = daysWithMultiple.length
  const avgProteinSources = Object.values(byDay).length > 0
    ? Object.values(byDay).reduce((s, ts) => s + ts.length, 0) / Object.values(byDay).length
    : 0

  let optimalDays = 0
  const allGapsHours: number[] = []

  for (const timestamps of daysWithMultiple) {
    const sorted = [...timestamps].sort((a, b) => a - b)
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push((sorted[i] - sorted[i - 1]) / 3600000)
    }
    allGapsHours.push(...gaps)
    if (gaps.every(g => g >= 2.5 && g <= 5)) optimalDays++
  }

  const hasData = daysAnalyzed >= 3
  const avgGapHours = allGapsHours.length > 0
    ? allGapsHours.reduce((s, g) => s + g, 0) / allGapsHours.length
    : null

  let insight: string
  if (avgGapHours === null) {
    insight = 'Not enough data yet — log meals with timestamps to unlock protein timing analysis.'
  } else if (avgGapHours < 2.5) {
    insight = 'Protein sources are clustered too close together — spread them 3-4h apart.'
  } else if (avgGapHours > 5) {
    insight = `Gaps between protein sources average ${avgGapHours.toFixed(1)}h — try tightening to 3-4h for better MPS.`
  } else {
    insight = `Protein spacing looks good — averaging ${avgGapHours.toFixed(1)}h between sources.`
  }

  return NextResponse.json({
    hasData,
    avgGapHours,
    avgProteinSources: Math.round(avgProteinSources * 10) / 10,
    daysAnalyzed,
    optimalDays,
    insight,
  })
}
