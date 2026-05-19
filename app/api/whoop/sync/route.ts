import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { whoopFetch } from '@/lib/whoop'
import { USER_ID } from '@/lib/userId'

export const maxDuration = 60

type WorkoutRecord = {
  id: number
  start: string
  end: string
  sport_id: number
  sport_name?: string
  score_state?: string
  score?: {
    strain?: number
    average_heart_rate?: number
    kilojoule?: number
  }
}

// Maps Whoop sport IDs to our session_type values
const SPORT_MAP: Record<number, string> = {
  44: 'Strength', 64: 'Strength', 49: 'Strength', 63: 'Strength',
  71: 'Soccer', 29: 'Soccer',
  1: 'Cardio', 46: 'Cardio', 167: 'Cardio', 58: 'Cardio', 165: 'Cardio',
  68: 'Cardio', 169: 'Cardio', 170: 'Cardio',
}

function sportNameToSessionType(name: string): string {
  const n = name.toLowerCase()
  if (['weight', 'lift', 'strength', 'power', 'functional'].some(k => n.includes(k))) return 'Strength'
  if (['soccer', 'football'].some(k => n.includes(k))) return 'Soccer'
  if (['run', 'cycl', 'bike', 'cardio', 'assault', 'row', 'swim', 'elliptical', 'stair', 'hike'].some(k => n.includes(k))) return 'Cardio'
  return 'Other'
}

function sportToSessionType(sportId: number, sportName?: string): string {
  if (SPORT_MAP[sportId]) return SPORT_MAP[sportId]
  if (sportName) return sportNameToSessionType(sportName)
  return 'Other'
}

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

async function ensureWorkoutColumns() {
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      logged_at INTEGER NOT NULL,
      session_type TEXT NOT NULL,
      notes TEXT,
      duration_minutes INTEGER
    )`,
    args: [],
  })
  for (const ddl of [
    `ALTER TABLE workout_sessions ADD COLUMN source TEXT DEFAULT 'manual'`,
    `ALTER TABLE workout_sessions ADD COLUMN strain REAL`,
  ]) {
    try { await db.execute({ sql: ddl, args: [] }) } catch { /* already exists */ }
  }
}

export async function POST() {
  const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const end = new Date().toISOString()

  const [recoveryRes, cycleRes, sleepRes, workoutRes] = await Promise.allSettled([
    whoopFetch(`/v2/recovery?limit=25&start=${start}&end=${end}`) as Promise<{ records: RecoveryRecord[] }>,
    whoopFetch(`/v2/cycle?limit=25&start=${start}&end=${end}`) as Promise<{ records: CycleRecord[] }>,
    whoopFetch(`/v2/activity/sleep?limit=25&start=${start}&end=${end}`) as Promise<{ records: SleepRecord[] }>,
    whoopFetch(`/v2/activity/workout?limit=25&start=${start}&end=${end}`) as Promise<{ records: WorkoutRecord[] }>,
  ])

  // If all four failed, bail out
  if (recoveryRes.status === 'rejected' && cycleRes.status === 'rejected' && sleepRes.status === 'rejected' && workoutRes.status === 'rejected') {
    const msg = recoveryRes.reason instanceof Error ? recoveryRes.reason.message : 'Sync failed'
    console.error('All Whoop endpoints failed:', msg)
    if (msg.includes('not connected')) return NextResponse.json({ error: 'Whoop not connected' }, { status: 401 })
    return NextResponse.json({ error: msg }, { status: 502 })
  }

  const recoveryRecords = recoveryRes.status === 'fulfilled' ? (recoveryRes.value.records ?? []) : []
  const cycleRecords = cycleRes.status === 'fulfilled' ? (cycleRes.value.records ?? []) : []
  const sleepRecords = sleepRes.status === 'fulfilled' ? (sleepRes.value.records ?? []) : []
  const workoutRecords = workoutRes.status === 'fulfilled' ? (workoutRes.value.records ?? []) : []

  if (recoveryRes.status === 'rejected') console.warn('Whoop recovery fetch failed:', recoveryRes.reason)
  if (cycleRes.status === 'rejected') console.warn('Whoop cycle fetch failed:', cycleRes.reason)
  if (sleepRes.status === 'rejected') console.warn('Whoop sleep fetch failed:', sleepRes.reason)
  if (workoutRes.status === 'rejected') console.warn('Whoop workout fetch failed:', workoutRes.reason)

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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        USER_ID,
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

  // Upsert workouts
  let workoutsUpserted = 0
  if (workoutRecords.length > 0) {
    await ensureWorkoutColumns()
    for (const w of workoutRecords) {
      if (w.score_state && w.score_state !== 'SCORED') continue
      const loggedAt = new Date(w.start).getTime()
      if (isNaN(loggedAt)) continue
      const durationMinutes = w.end
        ? Math.round((new Date(w.end).getTime() - loggedAt) / 60000)
        : null
      const sessionType = sportToSessionType(w.sport_id, w.sport_name)
      const sportLabel = (w.sport_name ?? `Sport ${w.sport_id}`).toLowerCase()
      const strain = w.score?.strain ?? null

      await db.execute({
        sql: `INSERT INTO workout_sessions (id, user_id, logged_at, session_type, notes, duration_minutes, source, strain)
              VALUES (?, ?, ?, ?, ?, ?, 'whoop', ?)
              ON CONFLICT(id) DO UPDATE SET
                session_type = excluded.session_type,
                duration_minutes = excluded.duration_minutes,
                strain = excluded.strain`,
        args: [`whoop-${w.id}`, USER_ID, loggedAt, sessionType, sportLabel, durationMinutes, strain],
      })
      workoutsUpserted++
    }
  }

  return NextResponse.json({
    synced: upserted,
    workouts: workoutsUpserted,
    dates: [...byDate.keys()].sort(),
  })
}
