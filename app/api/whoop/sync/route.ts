import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { whoopFetch } from '@/lib/whoop'

export const maxDuration = 60

// Whoop v2 types — recovery fields are top-level, not nested in score
type RecoveryRecord = {
  cycle_id: number
  created_at: string
  user_calibrating?: boolean
  recovery_score?: number
  resting_heart_rate?: number
  hrv_rmssd_milli?: number
  // v1 fallback shape
  score_state?: string
  score?: {
    recovery_score?: number
    resting_heart_rate?: number
    hrv_rmssd_milli?: number
  }
}

type CycleRecord = {
  id: number
  created_at: string
  start?: string
  score_state?: string
  score?: { strain?: number }
}

type SleepRecord = {
  id: number
  start: string
  end: string
  nap?: boolean
  score_state?: string
  score?: {
    stage_summary?: {
      total_in_bed_duration_milli?: number // v2
      total_in_bed_time_milli?: number     // v1
    }
    sleep_efficiency_percentage?: number
  }
}

function toDateStr(iso: string): string {
  return iso.split('T')[0]
}

export async function POST() {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const end = new Date().toISOString()

  const [recoveryRes, cycleRes, sleepRes] = await Promise.allSettled([
    whoopFetch(`/v2/recovery?limit=25&start=${start}&end=${end}`) as Promise<{ records: RecoveryRecord[] }>,
    whoopFetch(`/v2/cycle?limit=25&start=${start}&end=${end}`) as Promise<{ records: CycleRecord[] }>,
    whoopFetch(`/v2/activity/sleep?limit=25&start=${start}&end=${end}`) as Promise<{ records: SleepRecord[] }>,
  ])

  // If all three failed, bail out
  if (recoveryRes.status === 'rejected' && cycleRes.status === 'rejected' && sleepRes.status === 'rejected') {
    const msg = recoveryRes.reason instanceof Error ? recoveryRes.reason.message : 'Sync failed'
    console.error('All Whoop endpoints failed:', msg)
    if (msg.includes('not connected')) return NextResponse.json({ error: 'Whoop not connected' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const recoveryRecords = recoveryRes.status === 'fulfilled' ? (recoveryRes.value.records ?? []) : []
  const cycleRecords = cycleRes.status === 'fulfilled' ? (cycleRes.value.records ?? []) : []
  const sleepRecords = sleepRes.status === 'fulfilled' ? (sleepRes.value.records ?? []) : []

  if (recoveryRes.status === 'rejected') console.warn('Whoop recovery fetch failed:', recoveryRes.reason)
  if (cycleRes.status === 'rejected') console.warn('Whoop cycle fetch failed:', cycleRes.reason)
  if (sleepRes.status === 'rejected') console.warn('Whoop sleep fetch failed:', sleepRes.reason)

  const byDate = new Map<string, {
    recovery_score?: number
    hrv_ms?: number
    rhr?: number
    strain?: number
    sleep_minutes?: number
    sleep_efficiency?: number
    raw: Record<string, unknown>
  }>()

  // v2: recovery fields are top-level; v1: nested in score
  for (const r of recoveryRecords) {
    if (r.user_calibrating) continue
    const recovery_score = r.recovery_score ?? r.score?.recovery_score
    const hrv_ms = r.hrv_rmssd_milli ?? r.score?.hrv_rmssd_milli
    const rhr = r.resting_heart_rate ?? r.score?.resting_heart_rate
    if (!recovery_score) continue
    const date = toDateStr(r.created_at)
    const entry = byDate.get(date) ?? { raw: {} }
    entry.recovery_score = recovery_score
    entry.hrv_ms = hrv_ms
    entry.rhr = rhr
    entry.raw.recovery = r
    byDate.set(date, entry)
  }

  for (const c of cycleRecords) {
    if (c.score_state && c.score_state !== 'SCORED') continue
    if (!c.score?.strain) continue
    const date = toDateStr(c.created_at ?? c.start ?? '')
    if (!date) continue
    const entry = byDate.get(date) ?? { raw: {} }
    entry.strain = c.score.strain
    entry.raw.cycle = c
    byDate.set(date, entry)
  }

  for (const s of sleepRecords) {
    if (s.nap) continue
    if (s.score_state && s.score_state !== 'SCORED') continue
    if (!s.score) continue
    const date = toDateStr(s.end)
    const entry = byDate.get(date) ?? { raw: {} }
    // v2 uses duration_milli, v1 uses time_milli
    const totalMs = s.score.stage_summary?.total_in_bed_duration_milli
                 ?? s.score.stage_summary?.total_in_bed_time_milli
                 ?? 0
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
