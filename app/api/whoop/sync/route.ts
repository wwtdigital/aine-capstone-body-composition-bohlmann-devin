import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { whoopFetch } from '@/lib/whoop'

export const maxDuration = 60

type RecoveryRecord = {
  cycle_id: number
  created_at: string
  score_state: string
  score?: {
    recovery_score: number
    resting_heart_rate: number
    hrv_rmssd_milli: number
  }
}

type CycleRecord = {
  id: number
  created_at: string
  score_state: string
  score?: {
    strain: number
  }
}

type SleepRecord = {
  id: number
  start: string
  end: string
  nap: boolean
  score_state: string
  score?: {
    stage_summary?: { total_in_bed_time_milli: number }
    sleep_efficiency_percentage: number
  }
}

function toDateStr(iso: string): string {
  return iso.split('T')[0]
}

export async function POST() {
  let recoveryRecords: RecoveryRecord[] = []
  let cycleRecords: CycleRecord[] = []
  let sleepRecords: SleepRecord[] = []

  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const end = new Date().toISOString().split('T')[0]

  try {
    const [recoveryRes, cycleRes, sleepRes] = await Promise.all([
      whoopFetch(`/v1/recovery?limit=30&start=${start}&end=${end}`) as Promise<{ records: RecoveryRecord[] }>,
      whoopFetch(`/v1/cycle?limit=30&start=${start}&end=${end}`) as Promise<{ records: CycleRecord[] }>,
      whoopFetch(`/v1/activity/sleep?limit=30&start=${start}&end=${end}`) as Promise<{ records: SleepRecord[] }>,
    ])
    recoveryRecords = recoveryRes.records ?? []
    cycleRecords = cycleRes.records ?? []
    sleepRecords = sleepRes.records ?? []
  } catch (err) {
    console.error('Whoop sync fetch error:', err)
    const msg = err instanceof Error ? err.message : 'Sync failed'
    if (msg.includes('not connected')) {
      return NextResponse.json({ error: 'Whoop not connected' }, { status: 401 })
    }
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  // Index by date
  const byDate = new Map<string, {
    recovery_score?: number
    hrv_ms?: number
    rhr?: number
    strain?: number
    sleep_minutes?: number
    sleep_efficiency?: number
    raw: Record<string, unknown>
  }>()

  for (const r of recoveryRecords) {
    if (r.score_state !== 'SCORED' || !r.score) continue
    const date = toDateStr(r.created_at)
    const entry = byDate.get(date) ?? { raw: {} }
    entry.recovery_score = r.score.recovery_score
    entry.hrv_ms = r.score.hrv_rmssd_milli
    entry.rhr = r.score.resting_heart_rate
    entry.raw.recovery = r
    byDate.set(date, entry)
  }

  for (const c of cycleRecords) {
    if (c.score_state !== 'SCORED' || !c.score) continue
    const date = toDateStr(c.created_at)
    const entry = byDate.get(date) ?? { raw: {} }
    entry.strain = c.score.strain
    entry.raw.cycle = c
    byDate.set(date, entry)
  }

  for (const s of sleepRecords) {
    if (s.nap || s.score_state !== 'SCORED' || !s.score) continue
    const date = toDateStr(s.end)
    const entry = byDate.get(date) ?? { raw: {} }
    const totalMs = s.score.stage_summary?.total_in_bed_time_milli ?? 0
    entry.sleep_minutes = Math.round(totalMs / 60000)
    entry.sleep_efficiency = s.score.sleep_efficiency_percentage
    entry.raw.sleep = s
    byDate.set(date, entry)
  }

  let upserted = 0
  for (const [date, data] of byDate.entries()) {
    await db.execute({
      sql: `INSERT INTO whoop_daily (id, user_id, date, recovery_score, strain, hrv_ms, rhr, sleep_minutes, sleep_efficiency, raw_json)
            VALUES (?, 'will', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, date) DO UPDATE SET
              recovery_score = excluded.recovery_score,
              strain = excluded.strain,
              hrv_ms = excluded.hrv_ms,
              rhr = excluded.rhr,
              sleep_minutes = excluded.sleep_minutes,
              sleep_efficiency = excluded.sleep_efficiency,
              raw_json = excluded.raw_json`,
      args: [
        `whoop-${date}`,
        date,
        data.recovery_score ?? null,
        data.strain ?? null,
        data.hrv_ms ?? null,
        data.rhr ?? null,
        data.sleep_minutes ?? null,
        data.sleep_efficiency ?? null,
        JSON.stringify(data.raw),
      ],
    })
    upserted++
  }

  return NextResponse.json({ synced: upserted, dates: [...byDate.keys()].sort() })
}
