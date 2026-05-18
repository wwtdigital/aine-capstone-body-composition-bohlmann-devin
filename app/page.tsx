import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import Link from 'next/link'
import MacroRing from '@/components/MacroRing'
import MealList from '@/components/MealSheet'

export const revalidate = 0

type NutritionRow = { cal: number; prot: number; carbs: number; fat: number }
type InBodyRow = { reading_date: number; weight_kg: number | null; body_fat_pct: number | null; lean_mass_kg: number | null }
type MealRow = { id: string; logged_at: number; total_calories: number; total_protein: number; items_json: string; photo_url: string | null }
type WhoopRow = { date: string; recovery_score: number | null; strain: number | null; hrv_ms: number | null; rhr: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type WhoopWeekRow = { date: string; hrv_ms: number | null; recovery_score: number | null; sleep_minutes: number | null; sleep_efficiency: number | null }
type WeekNutritionRow = { day: string; cal: number }

export default async function Today() {
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const todayStr = new Date().toISOString().split('T')[0]
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const [nutritionResult, inbodyResult, mealsResult, whoopResult, whoopWeekResult, weekNutritionResult] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(total_calories),0) as cal, COALESCE(SUM(total_protein),0) as prot, COALESCE(SUM(total_carbs),0) as carbs, COALESCE(SUM(total_fat),0) as fat FROM meals WHERE user_id = 'will' AND logged_at >= ?`,
      args: [todayStart],
    }),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date DESC LIMIT 1`,
      args: [],
    }),
    db.execute({
      sql: `SELECT id, logged_at, total_calories, total_protein, items_json, photo_url FROM meals WHERE user_id = 'will' AND logged_at >= ? ORDER BY logged_at DESC LIMIT 8`,
      args: [todayStart],
    }),
    db.execute({
      sql: `SELECT date, recovery_score, strain, hrv_ms, rhr, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = 'will' AND date IN (?, ?) ORDER BY date DESC LIMIT 1`,
      args: [todayStr, yesterdayStr],
    }),
    db.execute({
      sql: `SELECT date, hrv_ms, recovery_score, sleep_minutes, sleep_efficiency FROM whoop_daily WHERE user_id = 'will' ORDER BY date DESC LIMIT 7`,
      args: [],
    }),
    db.execute({
      sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as cal FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day`,
      args: [Date.now() - 7 * 24 * 60 * 60 * 1000],
    }),
  ])

  const n = nutritionResult.rows[0] as unknown as NutritionRow
  const latest = inbodyResult.rows[0] as unknown as InBodyRow | undefined
  const meals = mealsResult.rows as unknown as MealRow[]
  const whoop = whoopResult.rows[0] as unknown as WhoopRow | undefined
  const whoopWeek = whoopWeekResult.rows as unknown as WhoopWeekRow[]
  const weekNutrition = weekNutritionResult.rows as unknown as WeekNutritionRow[]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  // HRV sparkline values — sorted oldest→newest for left-to-right display
  const hrvValues = [...whoopWeek].reverse().map(r => r.hrv_ms)

  // 7-day adherence: build array for last 7 calendar days
  const calMap: Record<string, number> = {}
  for (const row of weekNutrition) {
    calMap[row.day] = row.cal
  }
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000)
    const key = d.toISOString().split('T')[0]
    const initial = d.toLocaleDateString('en-US', { weekday: 'narrow' })
    const cal = calMap[key] ?? 0
    const pct = cal / GOALS.daily_calories
    const color = pct >= 0.9 ? 'bg-ok' : pct >= 0.5 ? 'bg-warn' : 'bg-surface'
    return { key, initial, color }
  })

  // Recovery score color
  const recoveryColor = (score: number | null) =>
    score == null ? 'text-ink3'
    : score >= 67 ? 'text-ok'
    : score >= 34 ? 'text-warn'
    : 'text-bad'

  return (
    <div className="min-h-screen bg-page pb-24">

      {/* Section 1: Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Today</h1>
          <p className="text-ink3 text-sm">{today}</p>
        </div>
      </div>

      {/* Section 2: Recovery */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Recovery</span>
          {whoop && (
            <span className="text-xs text-ink3">{whoop.date === todayStr ? 'Today' : 'Yesterday'}</span>
          )}
        </div>

        {!whoop && (
          <Link
            href="/settings"
            className="flex items-center gap-2 bg-warn/10 border border-warn/30 rounded-xl px-3 py-2 mb-3"
          >
            <span className="text-warn text-xs font-medium">Connect Whoop to see your real recovery data →</span>
          </Link>
        )}

        {/* Large recovery score */}
        <div className="flex items-center gap-4 mb-4">
          <div>
            <p className={`text-5xl font-bold tabular-nums leading-none ${recoveryColor(whoop?.recovery_score ?? (whoop ? null : 74))}`}>
              {whoop ? (whoop.recovery_score ?? '—') : <span className="text-ink3">74</span>}
            </p>
            <p className="text-ink3 text-xs mt-1">recovery score</p>
          </div>
          <div className="flex-1">
            <HrvSparkline values={whoop ? hrvValues : [48, 51, 55, 50, 53, 54, 52]} muted={!whoop} />
            <p className="text-ink3 text-xs mt-1 text-right">HRV 7d</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-5 gap-2 text-center pt-3 border-t border-line">
          {[
            {
              label: 'Sleep',
              value: (() => {
                const mins = whoop?.sleep_minutes ?? (whoop ? null : 7 * 60 + 12)
                if (mins == null) return '—'
                return `${Math.floor(mins / 60)}h ${mins % 60}m`
              })(),
            },
            {
              label: 'Efficiency',
              value: whoop
                ? (whoop.sleep_efficiency != null ? `${whoop.sleep_efficiency}%` : '—')
                : '87%',
            },
            {
              label: 'HRV',
              value: whoop
                ? (whoop.hrv_ms != null ? `${Math.round(whoop.hrv_ms)}ms` : '—')
                : '52ms',
            },
            {
              label: 'Strain',
              value: whoop
                ? (whoop.strain != null ? whoop.strain.toFixed(1) : '—')
                : '11.2',
            },
            {
              label: 'RHR',
              value: whoop
                ? (whoop.rhr != null ? `${Math.round(whoop.rhr)}bpm` : '—')
                : '56bpm',
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`font-bold text-sm tabular-nums ${!whoop ? 'text-ink3' : 'text-ink'}`}>{value}</p>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Nutrition */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-5">
        <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Nutrition</span>
        <div className="flex items-center justify-around mt-4 mb-4">
          <MacroRing
            value={Math.round(n.cal)}
            max={GOALS.daily_calories}
            color="#4a9eff"
            label="cal"
            valueDisplay={Math.round(n.cal).toLocaleString()}
            goalDisplay={GOALS.daily_calories.toLocaleString()}
          />
          <MacroRing
            value={Math.round(n.prot)}
            max={GOALS.daily_protein_g}
            color="#10b981"
            label="protein"
            valueDisplay={`${Math.round(n.prot)}g`}
            goalDisplay={`${GOALS.daily_protein_g}g`}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line">
          {[
            { label: 'Carbs', value: Math.round(n.carbs), unit: 'g', color: 'text-warn' },
            { label: 'Fat', value: Math.round(n.fat), unit: 'g', color: 'text-nourish' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="text-center py-1">
              <span className={`text-lg font-bold tabular-nums ${color}`}>{value}<span className="text-sm font-normal">{unit}</span></span>
              <p className="text-ink3 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day adherence strip */}
      <div className="mx-4 mt-3 bg-card rounded-2xl border border-line p-4">
        <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">7-Day Adherence</span>
        <div className="flex items-end justify-between mt-3 gap-1">
          {last7Days.map(({ key, initial, color }) => (
            <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
              <div className={`w-full h-2 rounded-full ${color}`} />
              <span className="text-ink3 text-xs">{initial}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-line">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-ok" /><span className="text-ink3 text-xs">≥90%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-warn" /><span className="text-ink3 text-xs">50–89%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-surface" /><span className="text-ink3 text-xs">&lt;50%</span></div>
        </div>
      </div>

      {/* Section 4: Body Composition */}
      {latest ? (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Body Comp</span>
            <span className="text-xs text-ink3">
              {new Date(latest.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatBlock
              value={latest.weight_kg?.toFixed(1) ?? '—'}
              unit="kg"
              delta={latest.weight_kg != null ? (latest.weight_kg - GOALS.weight_kg) : null}
              label="Weight"
              positiveIsGood={false}
            />
            <StatBlock
              value={latest.body_fat_pct?.toFixed(1) ?? '—'}
              unit="%"
              delta={latest.body_fat_pct != null ? (latest.body_fat_pct - GOALS.body_fat_pct) : null}
              label="Body Fat"
              positiveIsGood={false}
            />
            <div className="text-center">
              <p className="text-ink font-bold text-xl tabular-nums leading-tight">
                {latest.lean_mass_kg?.toFixed(1) ?? '—'}
              </p>
              <p className="text-ink3 text-xs mt-0.5">kg lean</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-card rounded-2xl border border-line p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Body Comp</span>
          </div>
          <Link
            href="/inbody/new"
            className="flex items-center gap-2 bg-brand/10 border border-brand/30 rounded-xl px-3 py-2 mb-3"
          >
            <span className="text-brand text-xs font-medium">Add your InBody readings to track real progress →</span>
          </Link>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">88.2<span className="text-sm font-normal">kg</span></p>
              <p className="text-ink3 text-xs mt-0.5">Weight</p>
            </div>
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">18.4<span className="text-sm font-normal">%</span></p>
              <p className="text-ink3 text-xs mt-0.5">Body Fat</p>
            </div>
            <div className="text-center">
              <p className="text-ink3 font-bold text-xl tabular-nums leading-tight">71.9</p>
              <p className="text-ink3 text-xs mt-0.5">kg lean</p>
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Meals Today */}
      <div className="mx-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-ink3 uppercase tracking-wider">Meals</span>
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-xs font-semibold text-ink3">Gallery</Link>
            <Link href="/log" className="text-xs font-semibold text-brand">+ Log meal</Link>
          </div>
        </div>

        {meals.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-6 text-center">
            <p className="text-ink3 text-sm">Nothing logged yet today</p>
            <Link href="/log" className="mt-3 inline-flex items-center gap-1.5 text-brand text-sm font-semibold">
              Take a photo →
            </Link>
          </div>
        ) : (
          <MealList meals={meals} />
        )}
      </div>
    </div>
  )
}

function HrvSparkline({ values, muted = false }: { values: (number | null)[]; muted?: boolean }) {
  const valid = values.filter(v => v != null) as number[]
  if (valid.length < 2) return null
  const min = Math.min(...valid), max = Math.max(...valid)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 100
      const y = v != null ? 32 - ((v - min) / range) * 28 : null
      return y != null ? `${x},${y}` : null
    })
    .filter(Boolean)
    .join(' ')
  return (
    <svg viewBox="0 0 100 32" className={`w-full h-8 ${muted ? 'opacity-40' : ''}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand"
      />
    </svg>
  )
}

function StatBlock({
  value, unit, delta, label, positiveIsGood,
}: {
  value: string; unit: string; delta: number | null; label: string; positiveIsGood: boolean
}) {
  const isPositive = delta != null && delta > 0
  const deltaColor =
    delta == null ? '' :
    (isPositive === positiveIsGood) ? 'text-ok' : 'text-warn'

  return (
    <div className="text-center">
      <p className="text-ink font-bold text-xl tabular-nums leading-tight">
        {value}<span className="text-ink3 text-sm font-normal">{unit}</span>
      </p>
      <p className="text-ink3 text-xs mt-0.5">{label}</p>
      {delta != null && (
        <p className={`text-xs font-semibold mt-0.5 ${deltaColor}`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit} to goal
        </p>
      )}
    </div>
  )
}
