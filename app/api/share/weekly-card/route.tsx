import { ImageResponse } from 'next/og'
import { db } from '@/lib/db'
import { USER_ID } from '@/lib/userId'

export const dynamic = 'force-dynamic'

type WorkoutRow = { session_type: string; duration_minutes: number | null; strain: number | null }
type WhoopRow = { recovery_score: number | null; hrv_ms: number | null; sleep_minutes: number | null }

const ACTIVITY_COLOR: Record<string, string> = {
  Strength: '#3b82f6',
  Soccer:   '#10b981',
  Cardio:   '#f59e0b',
  Other:    '#64748b',
}

export async function GET() {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const [workoutResult, whoopResult] = await Promise.all([
    db.execute({
      sql: `SELECT session_type, duration_minutes FROM workout_sessions WHERE user_id = ? AND logged_at >= ? ORDER BY logged_at DESC`,
      args: [USER_ID, sevenDaysAgo],
    }),
    db.execute({
      sql: `SELECT recovery_score, hrv_ms, sleep_minutes FROM whoop_daily WHERE user_id = ? ORDER BY date DESC LIMIT 7`,
      args: [USER_ID],
    }),
  ])

  const workouts = workoutResult.rows as unknown as WorkoutRow[]
  const whoopRows = whoopResult.rows as unknown as WhoopRow[]

  // Totals
  const workoutCount = workouts.length
  const totalMins = workouts.reduce((s, w) => s + (w.duration_minutes ?? 0), 0)
  const durationLabel = totalMins > 0
    ? totalMins >= 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m active` : `${totalMins}m active`
    : ''

  // Activity breakdown
  const counts: Record<string, number> = {}
  for (const w of workouts) counts[w.session_type] = (counts[w.session_type] ?? 0) + 1
  const activities = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 4)
  const maxCount = Math.max(...activities.map(([, c]) => c), 1)
  const BAR_MAX = 160 // px

  // Whoop averages
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
  const avgRecovery = avg(whoopRows.map(r => r.recovery_score).filter((v): v is number => v != null))
  const avgHrv     = avg(whoopRows.map(r => r.hrv_ms).filter((v): v is number => v != null))
  const avgSleepMs = avg(whoopRows.map(r => r.sleep_minutes).filter((v): v is number => v != null))
  const avgSleepLabel = avgSleepMs != null ? `${Math.floor(avgSleepMs / 60)}h ${avgSleepMs % 60}m` : '—'

  const strainSum = workouts.map(w => w.strain).filter((v): v is number => v != null).reduce((a, b) => a + b, 0)
  const strainLabel = workouts.some(w => w.strain != null) ? strainSum.toFixed(0) : '—'

  const recoveryColor = avgRecovery == null ? '#475569'
    : avgRecovery >= 67 ? '#10b981'
    : avgRecovery >= 34 ? '#f59e0b'
    : '#ef4444'

  // Week range label
  const now = new Date()
  const weekStart = new Date(now.getTime() - 6 * 86400000)
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weekRange = `${fmtDate(weekStart)} – ${fmtDate(now)}`

  const kpis = [
    { label: 'AVG RECOVERY', value: avgRecovery != null ? String(avgRecovery) : '—', unit: avgRecovery != null ? '/100' : '', color: recoveryColor },
    { label: 'AVG HRV',      value: avgHrv != null ? String(avgHrv) : '—',          unit: avgHrv != null ? 'ms' : '',   color: '#4a9eff' },
    { label: 'AVG SLEEP',    value: avgSleepLabel,                                   unit: '',                            color: '#8b5cf6' },
    { label: 'TOTAL STRAIN', value: strainLabel,                                     unit: '',                            color: '#f59e0b' },
  ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0b0b14',
          padding: '52px 44px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '52px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px', height: '28px',
              backgroundColor: '#4a9eff',
              borderRadius: '7px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontSize: '15px', fontWeight: '800', lineHeight: '1' }}>F</span>
            </div>
            <span style={{ color: '#4a9eff', fontSize: '14px', fontWeight: '700', letterSpacing: '0.15em' }}>FRAME</span>
          </div>
          <span style={{ color: '#334155', fontSize: '13px', fontWeight: '500' }}>This Week</span>
        </div>

        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '40px' }}>
          <span style={{ color: 'white', fontSize: '100px', fontWeight: '800', lineHeight: '0.85', letterSpacing: '-4px' }}>
            {workoutCount}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
            <span style={{ color: '#475569', fontSize: '20px', fontWeight: '500' }}>
              workout{workoutCount !== 1 ? 's' : ''}
            </span>
            {durationLabel && (
              <>
                <span style={{ color: '#1e2030', fontSize: '20px' }}>·</span>
                <span style={{ color: '#475569', fontSize: '20px', fontWeight: '500' }}>{durationLabel}</span>
              </>
            )}
          </div>
        </div>

        {/* KPI grid — 2 columns, 2 rows */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '36px' }}>
          {kpis.map(kpi => (
            <div
              key={kpi.label}
              style={{
                width: '141px',
                backgroundColor: '#11111c',
                borderRadius: '14px',
                padding: '18px 20px',
                border: '1px solid #1a1a2e',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ color: '#334155', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '8px' }}>
                {kpi.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ color: kpi.color, fontSize: '30px', fontWeight: '700', lineHeight: '1' }}>{kpi.value}</span>
                {kpi.unit && (
                  <span style={{ color: '#334155', fontSize: '13px', fontWeight: '500' }}>{kpi.unit}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Activity breakdown */}
        {activities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <span style={{ color: '#334155', fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '16px' }}>
              ACTIVITIES
            </span>
            {activities.map(([type, count]) => {
              const color = ACTIVITY_COLOR[type] ?? '#64748b'
              const barFill = Math.max(6, Math.round((count / maxCount) * BAR_MAX))
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <span style={{ color: 'white', fontSize: '15px', fontWeight: '600', width: '76px' }}>{type}</span>
                  <div style={{ width: `${BAR_MAX}px`, height: '5px', backgroundColor: '#1a1a2e', borderRadius: '3px', display: 'flex' }}>
                    <div style={{ width: `${barFill}px`, height: '5px', backgroundColor: color, borderRadius: '3px' }} />
                  </div>
                  <span style={{ color: '#475569', fontSize: '14px', fontWeight: '600' }}>{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: '20px',
          borderTop: '1px solid #1a1a2e',
        }}>
          <span style={{ color: '#1e2030', fontSize: '12px' }}>{weekRange}</span>
          <span style={{ color: '#1e2030', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' }}>frame.app</span>
        </div>
      </div>
    ),
    { width: 390, height: 844 }
  )
}
