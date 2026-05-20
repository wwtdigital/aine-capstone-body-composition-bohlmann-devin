import Link from 'next/link'
import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { USER_ID } from '@/lib/userId'
import { Plus, Upload, Camera } from 'lucide-react'
import WeightChart from '@/components/WeightChart'
import WeekCharts from '../week/WeekCharts'
import BodyCompCharts from '../month/BodyCompCharts'
import HrvChart from './HrvChart'
import MacroRadial from '@/components/MacroRadial'
import FramedCard from '@/components/FramedCard'
import ISymbol from '@/components/ISymbol'
import GapAnalysis from '@/components/GapAnalysis'
import ProgressTabBar from './ProgressTabBar'
import { Suspense } from 'react'

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
    <FramedCard className="bg-card rounded-2xl border border-line p-4">
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
    </FramedCard>
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

function generateSyntheticHrv(): { date: string; hrv: number }[] {
  const base = 52, variance = 8
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000)
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      hrv: Math.round(base + (Math.random() - 0.5) * variance * 2 + Math.sin(i / 4) * 4),
    }
  })
}

const kgToLbs = (kg: number | null | undefined) =>
  kg != null ? Math.round(kg * 2.20462) : null

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const [{ tab = 'nutrition' }, GOALS] = await Promise.all([searchParams, getGoals()])
  const activeTab = (tab === 'body' || tab === 'ask') ? tab : 'nutrition'
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

  // Streak: consecutive days logged from most recent
  const streakCount = [...days].reverse().reduce((count, d) => {
    if (count === -1) return count // already broken
    return d.calories > 0 ? count + 1 : -1
  }, 0)
  const streak = streakCount === -1 ? 0 : streakCount

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

  // Today's macro breakdown
  const todayNutritionResult = await db.execute({
    sql: `SELECT COALESCE(SUM(total_calories),0) as cal, COALESCE(SUM(total_protein),0) as prot, COALESCE(SUM(total_carbs),0) as carbs, COALESCE(SUM(total_fat),0) as fat FROM meals WHERE user_id = 'will' AND logged_at >= ?`,
    args: [new Date().setUTCHours(0,0,0,0)],
  })
  const todayN = todayNutritionResult.rows[0] as unknown as { cal: number; prot: number; carbs: number; fat: number }

  const whoopHrvResult = await db.execute({
    sql: `SELECT date, hrv_ms FROM whoop_daily WHERE user_id = 'will' ORDER BY date ASC LIMIT 30`,
    args: [],
  })
  const whoopHrv = whoopHrvResult.rows as unknown as { date: string; hrv_ms: number | null }[]

  let recentPhotos: { id: string; pose: string; photo_url: string; taken_at: number }[] = []
  try {
    const photosResult = await db.execute({
      sql: `SELECT id, pose, photo_url, taken_at FROM progress_photos WHERE user_id = ? ORDER BY taken_at DESC LIMIT 6`,
      args: [USER_ID],
    })
    recentPhotos = photosResult.rows as unknown as typeof recentPhotos
  } catch { /* table may not exist yet */ }

  const hrvChartData = whoopHrv.length >= 3
    ? whoopHrv.map(r => ({
        date: new Date(r.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hrv: r.hrv_ms != null ? Math.round(r.hrv_ms) : null,
      }))
    : generateSyntheticHrv()
  const isHrvSynthetic = whoopHrv.length < 3

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="px-4 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-ink tracking-tight">Progress</h1>
        <Link href="/progress-photos" className="text-xs font-medium text-ink3 flex items-center gap-1">
          <Camera size={12} />Photos ›
        </Link>
      </div>

      <Suspense>
        <ProgressTabBar activeTab={activeTab as 'nutrition' | 'body' | 'ask'} />
      </Suspense>

      <div className="px-4 pt-6 space-y-8">
        {/* ── Nutrition (7 Days) ── */}
        <section id="nutrition" className={activeTab === 'nutrition' ? 'space-y-4' : 'hidden'}>
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Nutrition (7 Days)</span>
            <div className="flex-1 h-px bg-line" />
            {streak > 0 && <span className="text-xs font-semibold text-ok shrink-0 tabular-nums">{streak}-day streak</span>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FramedCard className="bg-card rounded-2xl border border-line p-4">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Calories</p>
              <p className="text-ink font-bold text-3xl tabular-nums">{avgCal > 0 ? avgCal.toLocaleString() : '—'}</p>
              <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_calories.toLocaleString()}</p>
              {avgCal > 0 && (
                <p className={`text-xs mt-1.5 font-semibold ${avgCal >= GOALS.daily_calories ? 'text-ok' : 'text-warn'}`}>
                  {Math.round((avgCal / GOALS.daily_calories) * 100)}% of goal
                </p>
              )}
            </FramedCard>
            <FramedCard className="bg-card rounded-2xl border border-line p-4">
              <p className="text-ink3 text-xs font-semibold uppercase tracking-wider mb-2">Avg Protein</p>
              <p className="text-ink font-bold text-3xl tabular-nums">{avgProt > 0 ? `${avgProt}g` : '—'}</p>
              <p className="text-ink3 text-xs mt-1">goal: {GOALS.daily_protein_g}g</p>
              {avgProt > 0 && (
                <p className={`text-xs mt-1.5 font-semibold ${avgProt >= GOALS.daily_protein_g ? 'text-ok' : 'text-warn'}`}>
                  {Math.round((avgProt / GOALS.daily_protein_g) * 100)}% of goal
                </p>
              )}
            </FramedCard>
          </div>

          <FramedCard className="bg-card rounded-2xl border border-line p-4">
            <div className="flex items-center gap-2 mb-3">
              <ISymbol size={14} className="text-ink3 opacity-60" />
              <span className="eyebrow">Today&apos;s Macro Split</span>
            </div>
            <MacroRadial
              calories={Math.round(todayN.cal)}
              protein={Math.round(todayN.prot)}
              carbs={Math.round(todayN.carbs)}
              fat={Math.round(todayN.fat)}
              calGoal={GOALS.daily_calories}
              proteinGoal={GOALS.daily_protein_g}
            />
          </FramedCard>


          {daysWithData.length === 0 ? (
            <Link href="/log" className="block">
              <FramedCard className="bg-card rounded-2xl border border-line p-8 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center">
                  <Camera size={22} className="text-ink3" />
                </div>
                <p className="text-ink2 text-sm font-semibold">Log your first meal to see weekly trends →</p>
              </FramedCard>
            </Link>
          ) : (
            <FramedCard className="bg-card rounded-2xl border border-line p-4">
              <WeekCharts days={days} calorieGoal={GOALS.daily_calories} proteinGoal={GOALS.daily_protein_g} />
            </FramedCard>
          )}

          {daysWithData.length > 0 && (
            <FramedCard className="bg-card rounded-2xl border border-line divide-y divide-line">
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
            </FramedCard>
          )}
        </section>

        {/* ── Body Composition ── */}
        <section id="body" className={activeTab === 'body' ? 'space-y-4' : 'hidden'}>
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Body Composition</span>
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
              {readings.length >= 2 && (() => {
                const first = readings[0]
                const last = readings[readings.length - 1]
                const daysDiff = Math.round((last.reading_date - first.reading_date) / (1000 * 60 * 60 * 24))
                const wDelta = last.weight_kg != null && first.weight_kg != null ? last.weight_kg - first.weight_kg : null
                const bDelta = last.body_fat_pct != null && first.body_fat_pct != null ? last.body_fat_pct - first.body_fat_pct : null
                const lDelta = last.lean_mass_kg != null && first.lean_mass_kg != null ? last.lean_mass_kg - first.lean_mass_kg : null

                const DeltaChip = ({ value, unit, label, lowerIsBetter }: { value: number | null; unit: string; label: string; lowerIsBetter: boolean }) => {
                  if (value == null) return null
                  const good = lowerIsBetter ? value < 0 : value > 0
                  const color = Math.abs(value) < 0.1 ? 'text-ink3' : good ? 'text-ok' : 'text-warn'
                  const arrow = value > 0.1 ? '↑' : value < -0.1 ? '↓' : '→'
                  return (
                    <div className="text-center">
                      <p className={`text-lg font-bold tabular-nums ${color}`}>
                        {arrow} {Math.abs(value).toFixed(1)}{unit}
                      </p>
                      <p className="text-ink3 text-xs mt-0.5">{label}</p>
                    </div>
                  )
                }

                return (
                  <FramedCard className="bg-gradient-to-br from-brand/8 to-ok/5 rounded-2xl border border-brand/20 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-ink2 text-xs font-semibold uppercase tracking-wider">Progress Since First Scan</p>
                      <p className="text-ink3 text-xs">{daysDiff}d</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <DeltaChip value={wDelta != null ? kgToLbs(wDelta) : null} unit="lbs" label="Weight" lowerIsBetter={true} />
                      <DeltaChip value={bDelta} unit="%" label="Body Fat" lowerIsBetter={true} />
                      <DeltaChip value={lDelta != null ? kgToLbs(lDelta) : null} unit="lbs" label="Lean Mass" lowerIsBetter={false} />
                    </div>
                  </FramedCard>
                )
              })()}

              {/* Weight Trend — only if we have readings */}
              {readings.length > 1 && (
                <FramedCard className="bg-card rounded-2xl border border-line p-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ISymbol size={14} className="text-ink3 opacity-60" />
                    <span className="eyebrow">Weight Trend</span>
                  </div>
                  <WeightChart
                    readings={readings.map(r => ({
                      date: new Date(r.reading_date).toISOString().split('T')[0],
                      weight_kg: kgToLbs(r.weight_kg) ?? 0,
                      body_fat_pct: r.body_fat_pct,
                      lean_mass_kg: r.lean_mass_kg,
                    }))}
                    goalWeight={GOALS.target_weight_lbs}
                  />
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-brand rounded-full" /><span className="text-ink4 text-xs">Weight</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-warn rounded-full" /><span className="text-ink4 text-xs">Body fat %</span></div>
                  </div>
                </FramedCard>
              )}

              <div className="grid grid-cols-2 gap-3">
                <GoalCard
                  label="Weight"
                  value={kgToLbs(latest.weight_kg)?.toString() ?? '—'}
                  unit="lbs"
                  goal={`${GOALS.target_weight_lbs} lbs`}
                  delta={latest.weight_kg != null ? (kgToLbs(latest.weight_kg) ?? 0) - GOALS.target_weight_lbs : null}
                  positiveIsGood={false}
                />
                <GoalCard
                  label="Body Fat"
                  value={latest.body_fat_pct?.toFixed(1) ?? '—'}
                  unit="%"
                  goal={`${GOALS.target_body_fat_pct}%`}
                  delta={latest.body_fat_pct != null ? latest.body_fat_pct - GOALS.target_body_fat_pct : null}
                  positiveIsGood={false}
                />
              </div>

              {readings.length >= 2 && (
                <FramedCard className="bg-card rounded-2xl border border-line p-4">
                  <BodyCompCharts
                    data={chartData.map(d => ({
                      ...d,
                      weight: d.weight != null ? kgToLbs(d.weight) : null,
                      lean: d.lean != null ? kgToLbs(d.lean) : null,
                    }))}
                    weightGoal={GOALS.target_weight_lbs}
                    bfGoal={GOALS.target_body_fat_pct}
                  />
                </FramedCard>
              )}

              {recentPhotos.length > 0 && (
                <FramedCard className="bg-card rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="eyebrow">Recent Photos</span>
                    <Link href="/progress-photos" className="text-xs text-brand font-semibold">View all ›</Link>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {recentPhotos.map(p => (
                      <div key={p.id} className="shrink-0 w-20 rounded-xl overflow-hidden aspect-[3/4] bg-surface relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.photo_url} alt={p.pose} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-black/50">
                          <span className="text-white text-[10px] font-medium capitalize">{p.pose}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-ink4 text-xs mt-2">
                    {new Date(recentPhotos[0].taken_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </FramedCard>
              )}

              <FramedCard className="bg-card rounded-2xl border border-line p-4">
                {isHrvSynthetic && (
                  <p className="text-warn text-xs font-medium mb-2">Demo data — connect Whoop to see your HRV</p>
                )}
                <HrvChart data={hrvChartData} />
              </FramedCard>

              <FramedCard className="bg-card rounded-2xl border border-line divide-y divide-line">
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
                        <Metric value={kgToLbs(r.weight_kg)?.toString()} unit="lbs" />
                        <Metric value={r.body_fat_pct?.toFixed(1)} unit="%" label="bf" />
                        <Metric value={kgToLbs(r.lean_mass_kg)?.toString()} unit="" label="lean lbs" />
                      </div>
                    </div>
                  )
                })}
              </FramedCard>
            </>
          )}
        </section>

        {/* ── Ask AI ── */}
        <section id="ask" className={activeTab === 'ask' ? 'space-y-4' : 'hidden'}>
          <div className="flex items-center gap-3">
            <ISymbol size={14} className="text-ink3 opacity-60 shrink-0" />
            <span className="eyebrow shrink-0">Ask AI</span>
            <div className="flex-1 h-px bg-line" />
          </div>
          <GapAnalysis />
        </section>
      </div>
    </div>
  )
}
