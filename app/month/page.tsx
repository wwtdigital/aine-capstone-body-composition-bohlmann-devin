import Link from 'next/link'
import { db } from '@/lib/db'
import { GOALS } from '@/lib/goals'
import { Plus, Upload } from 'lucide-react'
import BodyCompCharts from './BodyCompCharts'

export const revalidate = 0

type Reading = {
  reading_date: number
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

export default async function MonthPage() {
  const result = await db.execute({
    sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date ASC LIMIT 30`,
    args: [],
  })

  const readings = result.rows as unknown as Reading[]
  const latest = readings[readings.length - 1]

  const chartData = readings.map(r => ({
    date: new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: r.weight_kg,
    bf: r.body_fat_pct,
    lean: r.lean_mass_kg,
  }))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <div className="flex items-start justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Body Comp</h1>
          <p className="text-zinc-500 dark:text-zinc-500 text-sm">InBody readings</p>
        </div>
        <div className="flex gap-2 mt-1">
          <Link
            href="/inbody/new"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-800 text-white text-xs font-semibold active:scale-95 transition-transform"
          >
            <Plus size={14} />
            Add
          </Link>
          <Link
            href="/inbody/import"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold active:scale-95 transition-transform"
          >
            <Upload size={14} />
            Import
          </Link>
        </div>
      </div>

      {readings.length === 0 ? (
        <div className="mx-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center">
          <p className="text-zinc-400 dark:text-zinc-600 text-sm">No InBody readings yet.</p>
          <Link href="/inbody/new" className="mt-3 inline-block text-blue-600 dark:text-blue-400 text-sm font-semibold">Add a reading →</Link>
        </div>
      ) : (
        <div className="px-4 space-y-4">
          {/* Progress to goals */}
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

          {/* Charts */}
          {readings.length >= 2 && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <BodyCompCharts data={chartData} weightGoal={GOALS.weight_kg} bfGoal={GOALS.body_fat_pct} />
            </div>
          )}

          {/* History */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...readings].reverse().map(r => (
              <div key={r.reading_date} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  {new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex gap-5">
                  <Metric value={r.weight_kg?.toFixed(1)} unit="kg" />
                  <Metric value={r.body_fat_pct?.toFixed(1)} unit="%" label="bf" />
                  <Metric value={r.lean_mass_kg?.toFixed(1)} unit="" label="lean" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GoalCard({
  label, value, unit, goal, delta, positiveIsGood,
}: {
  label: string; value: string; unit: string; goal: string; delta: number | null; positiveIsGood: boolean
}) {
  const deltaColor = delta == null
    ? ''
    : (delta > 0) === positiveIsGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400'

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
      <p className="text-zinc-500 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">{label}</p>
      <p className="text-zinc-900 dark:text-white font-bold text-2xl tabular-nums">
        {value}<span className="text-zinc-400 dark:text-zinc-600 text-base font-normal">{unit}</span>
      </p>
      <p className="text-zinc-400 dark:text-zinc-600 text-xs mt-0.5">goal: {goal}</p>
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
      <p className="text-zinc-900 dark:text-white text-sm font-semibold tabular-nums">{value ?? '—'}{unit}</p>
      {label && <p className="text-zinc-400 dark:text-zinc-600 text-xs">{label}</p>}
    </div>
  )
}
