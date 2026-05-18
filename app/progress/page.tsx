import Link from 'next/link'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import { Plus, Upload, Camera } from 'lucide-react'
import WeekCharts from '../week/WeekCharts'
import BodyCompCharts from '../month/BodyCompCharts'

export const revalidate = 0

type DayRow = { day: string; calories: number; protein: number }
type DayData = { day: string; calories: number; protein: number }

type Reading = {
  reading_date: number
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

function GoalCard({
  label, value, unit, goal, delta, positiveIsGood,
}: {
  label: string; value: string; unit: string; goal: string; delta: number | null; positiveIsGood: boolean
}) {
  const deltaColor = delta == null ? '' :
    (delta > 0) === positiveIsGood ? 'text-ok' : 'text-warn'

  return (
    <div className="bg-card rounded-2xl border border-line p-4">
      <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-ink font-bold text-2xl tabular-nums">
        {value}<span className="text-ink3 text-base font-normal">{unit}</span>
      </p>
      <p className="text-ink3 text-xs mt-0.5">goal: {goal}</p>
      {delta != null && (
        <p className={`text-xs font-semibold mt-1.5 ${deltaColor}`}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit}
        </p>
      )}
    </div>
  )
}

function Metric({ value, unit, label }: { value: string | undefined; unit: string; label?: string }) {
  return (
    <div className="text-right">
      <p className="text-ink text-sm font-semibold tabular-nums">{value ?? '—'}{unit}</p>
      {label && <p className="text-ink3 text-xs">{label}</p>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-ink3 shrink-0">{children}</h2>
      <div className="flex-1 h-px bg-line" />
    </div>
  )
}

export default async function ProgressPage() {
  // Nutrition query (last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  const nutritionResult = await db.execute({
    sql: `SELECT date(logged_at/1000, 'unixepoch') as day, ROUND(SUM(total_calories)) as calories, ROUND(SUM(total_protein)) as protein FROM meals WHERE user_id = 'will' AND logged_at >= ? GROUP BY day ORDER BY day ASC`,
    args: [sevenDaysAgo],
  })

  const rows = nutritionResult.rows as unknown as DayRow[]

  const days: DayData[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dayStr = d.toISOString().split('T')[0]
    const found = rows.find(r => r.day === dayStr)
    days.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      calories: found ? Number(found.calories) : 0,
      protein: found ? Number(found.protein) : 0,
    })
  }

  const daysWithData = days.filter(d => d.calories > 0)
  const avgCal = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.calories, 0) / daysWithData.length)
    : 0
  const avgProt = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + d.protein, 0) / daysWithData.length)
    : 0

  // Body comp query
  const bodyResult = await db.execute({
    sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date ASC LIMIT 30`,
    args: [],
  })

  const readings = bodyResult.rows as unknown as Reading[]
  const latest = readings[readings.length - 1]

  const chartData = readings.map(r => ({
    date: new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: r.weight_kg,
    bf: r.body_fat_pct,
    lean: r.lean_mass_kg,
  }))

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-ink tracking-tight">Progress</h1>
      </div>

      {/* Sticky tab bar */}
      <div className="bg-page/95 backdrop-blur-md sticky top-0 z-10 px-4 py-2 flex gap-2 border-b border-line">
        <a
          href="#nutrition"
          className="px-4 py-1.5 rounded-xl text-xs font-semibold text-ink2 bg-surface border border-line active:scale-95 transition-transform"
        >
          Nutrition
        </a>
        <a
          href="#body"
          className="px-4 py-1.5 rounded-xl text-xs font-semibold text-ink2 bg-surface border border-line active:scale-95 transition-transform"
        >
          Body Comp
        </a>
      </div>

      <div className="px-4 pt-6 space-y-8">
        {/* ── Nutrition (7 Days) ── */}
        <section id="nutrition" className="space-y-4">
          <SectionHeader>Nutrition (7 Days)</SectionHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl border border-line p-4">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Calories</p>
              <p className="text-ink font-bold text-3xl tabular-nums">{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
              <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_calories.toLocaleString()}</p>
              {avgCal > 0 && (
                <p className={`text-xs mt-1.5 font-semibold ${avgCal >= GOALS.daily_calories ? 'text-ok' : 'text-warn'}`}>
                  {Math.round((avgCal / GOALS.daily_calories) * 100)}% of goal
                </p>
              )}
            </div>
            <div className="bg-card rounded-2xl border border-line p-4">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Protein</p>
              <p className="text-ink font-bold text-3xl tabular-nums">{avgProt > 0 ? `${avgProt}g` : '—'}</p>
              <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_protein_g}g</p>
              {avgProt > 0 && (
                <p className={`text-xs mt-1.5 font-semibold ${avgProt >= GOALS.daily_protein_g ? 'text-ok' : 'text-warn'}`}>
                  {Math.round((avgProt / GOALS.daily_protein_g) * 100)}% of goal
                </p>
              )}
            </div>
          </div>

          {daysWithData.length === 0 ? (
            <Link href="/log" className="block">
              <div className="bg-card rounded-2xl border border-line p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center">
                  <Camera size={22} className="text-ink3" />
                </div>
                <p className="text-ink2 text-sm font-semibold">Log your first meal to see weekly trends →</p>
              </div>
            </Link>
          ) : (
            <div className="bg-card rounded-2xl border border-line p-4">
              <WeekCharts days={days} calorieGoal={GOALS.daily_calories} proteinGoal={GOALS.daily_protein_g} />
            </div>
          )}

          {daysWithData.length > 0 && (
            <div className="bg-card rounded-2xl border border-line divide-y divide-line">
              {[...days].reverse().map((d, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <span className="text-ink2 text-sm w-10">{d.day}</span>
                  {d.calories > 0 ? (
                    <>
                      <div className="flex-1 mx-3">
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${Math.min(100, (d.calories / GOALS.daily_calories) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-ink text-sm font-semibold tabular-nums">{d.calories.toLocaleString()}</span>
                        <span className="text-ink3 text-xs ml-1">cal</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-ink4 text-sm flex-1 text-right">—</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Body Composition ── */}
        <section id="body" className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink3 shrink-0">Body Composition</h2>
            <div className="flex-1 h-px bg-line" />
            <div className="flex gap-2 shrink-0">
              <Link
                href="/inbody/new"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand text-page text-xs font-semibold active:scale-95 transition-transform"
              >
                <Plus size={14} />
                Add
              </Link>
              <Link
                href="/inbody/import"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-line text-ink2 text-xs font-semibold active:scale-95 transition-transform"
              >
                <Upload size={14} />
                Import
              </Link>
            </div>
          </div>

          {readings.length === 0 ? (
            <div className="bg-card rounded-2xl border border-line p-10 text-center">
              <p className="text-ink3 text-sm">No InBody readings yet.</p>
              <Link href="/inbody/new" className="mt-3 inline-block text-brand text-sm font-semibold">Add a reading →</Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <GoalCard
                  label="Weight"
                  value={latest.weight_kg?.toFixed(1) ?? '—'}
                  unit="kg"
                  goal={`${GOALS.weight_kg} kg`}
                  delta={latest.weight_kg != null ? latest.weight_kg - GOALS.weight_kg : null}
                  positiveIsGood={false}
                />
                <GoalCard
                  label="Body Fat"
                  value={latest.body_fat_pct?.toFixed(1) ?? '—'}
                  unit="%"
                  goal={`${GOALS.body_fat_pct}%`}
                  delta={latest.body_fat_pct != null ? latest.body_fat_pct - GOALS.body_fat_pct : null}
                  positiveIsGood={false}
                />
              </div>

              {readings.length >= 2 && (
                <div className="bg-card rounded-2xl border border-line p-4">
                  <BodyCompCharts data={chartData} weightGoal={GOALS.weight_kg} bfGoal={GOALS.body_fat_pct} />
                </div>
              )}

              <div className="bg-card rounded-2xl border border-line divide-y divide-line">
                {[...readings].reverse().map((r, idx, arr) => {
                  const prev = arr[idx + 1]
                  let trend: string | null = null
                  if (prev?.weight_kg != null && r.weight_kg != null) {
                    const diff = r.weight_kg - prev.weight_kg
                    trend = diff > 0.05 ? '↑' : diff < -0.05 ? '↓' : '→'
                  }
                  return (
                    <div key={r.reading_date} className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="text-ink2 text-sm">
                          {new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        {trend && (
                          <span className={`text-xs font-bold ${trend === '↑' ? 'text-warn' : trend === '↓' ? 'text-ok' : 'text-ink3'}`}>
                            {trend}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-5">
                        <Metric value={r.weight_kg?.toFixed(1)} unit="kg" />
                        <Metric value={r.body_fat_pct?.toFixed(1)} unit="%" label="bf" />
                        <Metric value={r.lean_mass_kg?.toFixed(1)} unit="" label="lean" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
