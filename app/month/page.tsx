import Link from 'next/link'
import { db } from '@/lib/db'
import { getGoals } from '@/lib/getGoals'
import { Plus, Upload } from 'lucide-react'
import BodyCompCharts from './BodyCompCharts'

export const revalidate = 0

type Reading = {
  reading_date: number
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
}

const kgToLbs = (kg: number | null | undefined) =>
  kg != null ? Math.round(kg * 2.20462) : null

export default async function MonthPage() {
  const [GOALS, result] = await Promise.all([
    getGoals(),
    db.execute({
      sql: `SELECT reading_date, weight_kg, body_fat_pct, lean_mass_kg FROM inbody_readings WHERE user_id = 'will' ORDER BY reading_date ASC LIMIT 30`,
      args: [],
    }),
  ])

  const readings = result.rows as unknown as Reading[]
  const latest = readings[readings.length - 1]

  const chartData = readings.map(r => ({
    date: new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: kgToLbs(r.weight_kg),
    bf: r.body_fat_pct,
    lean: kgToLbs(r.lean_mass_kg),
  }))

  return (
    <div className="min-h-screen bg-page pb-24">
      <div className="flex items-start justify-between px-4 pt-12 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">Body Comp</h1>
          <p className="text-ink3 text-sm">InBody readings</p>
        </div>
        <div className="flex gap-2 mt-1">
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
        <div className="mx-4 bg-card rounded-2xl border border-line p-10 text-center">
          <p className="text-ink3 text-sm">No InBody readings yet.</p>
          <Link href="/inbody/new" className="mt-3 inline-block text-brand text-sm font-semibold">Add a reading →</Link>
        </div>
      ) : (
        <div className="px-4 space-y-4">
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
            <div className="bg-card rounded-2xl border border-line p-4">
              <BodyCompCharts data={chartData} weightGoal={GOALS.target_weight_lbs} bfGoal={GOALS.target_body_fat_pct} />
            </div>
          )}

          <div className="bg-card rounded-2xl border border-line divide-y divide-line">
            {[...readings].reverse().map(r => (
              <div key={r.reading_date} className="flex items-center justify-between px-4 py-3.5">
                <p className="text-ink2 text-sm">
                  {new Date(r.reading_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="flex gap-5">
                  <Metric value={kgToLbs(r.weight_kg)?.toString()} unit="lbs" />
                  <Metric value={r.body_fat_pct?.toFixed(1)} unit="%" label="bf" />
                  <Metric value={kgToLbs(r.lean_mass_kg)?.toString()} unit="" label="lean lbs" />
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
          {delta > 0 ? '+' : ''}{Math.round(Math.abs(delta))}{unit} {delta > 0 ? 'over' : 'to'} goal
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
